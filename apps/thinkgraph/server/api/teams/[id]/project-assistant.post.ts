import { streamText, tool } from 'ai'
import { z } from 'zod/v3'
import { eq, and } from 'drizzle-orm'
import { getAllThinkgraphWorkItems } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'
import { getAllThinkgraphProjects } from '~~/layers/thinkgraph/collections/projects/server/database/queries'
import { createThinkgraphWorkItem, updateThinkgraphWorkItem, deleteThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { flowConfigs } from '~~/server/db/schema'

/**
 * Project assistant chat endpoint with tool calling.
 * Can read project state, create/update/delete work items, and arrange canvas layout.
 *
 * POST /api/teams/[id]/project-assistant
 * Body: { messages, projectId, flowId? }
 */
export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const { messages, projectId, flowId } = await readBody(event)

  if (!projectId) {
    throw createError({ status: 400, statusText: 'Missing projectId' })
  }

  const ai = createAIProvider(event)

  // Build project context
  const [allItems, allProjects] = await Promise.all([
    getAllThinkgraphWorkItems(team.id),
    getAllThinkgraphProjects(team.id),
  ])

  const project = allProjects.find((p: any) => p.id === projectId)
  const projectItems = allItems.filter((i: any) => i.projectId === projectId)

  const statusCounts: Record<string, number> = {}
  for (const item of projectItems) {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
  }

  // Build item list with IDs for tool reference
  const itemList = projectItems
    .map((i: any) => `- [${i.id}] "${i.title}" (${i.type}, ${i.status}, assignee: ${i.assignee || 'pi'}${i.parentId ? ', parent: ' + i.parentId : ''})`)

  const learnings = projectItems
    .filter((i: any) => i.type === 'review' && i.assignee === 'human' && i.status === 'queued')
    .map((i: any) => `- [${i.id}] ${i.title}: ${i.brief || '(no detail)'}`)

  const systemPrompt = `You are the ThinkGraph project assistant for "${project?.name || 'Unknown'}".

## Project
- Name: ${project?.name}
- Client: ${project?.clientName || 'N/A'}
- Status: ${project?.status}
- Description: ${project?.description || 'N/A'}
- Flow ID: ${flowId || 'unknown'}

## All Work Items (${projectItems.length})
${itemList.join('\n') || 'None'}

## Status Summary
${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}

## Learnings Pending Triage (${learnings.length})
${learnings.join('\n') || 'None'}

## Your Role
You are a PM assistant with tools to take action. You can:
- Create, update, and delete work items
- Arrange nodes on the canvas (group related items, clean up layout)
- Batch-dismiss learnings that aren't actionable
- Promote learnings to tasks

Keep answers concise. Use tools to take action when the user asks.
When you take actions, briefly confirm what you did.

When suggesting a next action without using tools, format as:
ACTION: <type> — <title>
BRIEF: <what the work item should do>
`

  const result = await streamText({
    model: ai.model('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages,
    tools: {
      createWorkItem: tool({
        description: 'Create a new work item in the project',
        parameters: z.object({
          title: z.string().describe('Work item title'),
          type: z.enum(['discover', 'architect', 'generate', 'compose', 'review', 'deploy']),
          brief: z.string().optional().describe('What needs to happen'),
          assignee: z.enum(['pi', 'human', 'client']).default('pi'),
          parentId: z.string().optional().describe('Parent work item ID'),
          status: z.enum(['queued', 'active', 'waiting', 'done', 'blocked']).default('queued'),
        }),
        execute: async (params) => {
          const item = await createThinkgraphWorkItem({
            teamId: team.id,
            owner: 'system',
            projectId,
            title: params.title,
            type: params.type,
            brief: params.brief || '',
            assignee: params.assignee,
            parentId: params.parentId,
            status: params.status,
            skill: ['discover', 'architect', 'generate', 'compose'].includes(params.type) ? params.type : undefined,
          } as any)
          return { success: true, id: item.id, title: params.title }
        },
      }),

      updateWorkItem: tool({
        description: 'Update an existing work item (change status, type, assignee, title)',
        parameters: z.object({
          id: z.string().describe('Work item ID'),
          status: z.enum(['queued', 'active', 'waiting', 'done', 'blocked']).optional(),
          type: z.enum(['discover', 'architect', 'generate', 'compose', 'review', 'deploy']).optional(),
          assignee: z.enum(['pi', 'human', 'client']).optional(),
          title: z.string().optional(),
          brief: z.string().optional(),
        }),
        execute: async (params) => {
          const { id, ...updates } = params
          const filtered: Record<string, any> = {}
          for (const [k, v] of Object.entries(updates)) {
            if (v !== undefined) filtered[k] = v
          }
          if (Object.keys(filtered).length === 0) return { success: false, error: 'No updates' }

          await updateThinkgraphWorkItem(id, team.id, 'system', filtered, { role: 'admin' })
          return { success: true, id, updated: Object.keys(filtered) }
        },
      }),

      deleteWorkItem: tool({
        description: 'Delete a work item. Cannot delete items with children.',
        parameters: z.object({
          id: z.string().describe('Work item ID'),
        }),
        execute: async (params) => {
          const hasChildren = projectItems.some((i: any) => i.parentId === params.id)
          if (hasChildren) return { success: false, error: 'Cannot delete item with children' }

          await deleteThinkgraphWorkItem(params.id, team.id, 'system', { role: 'admin' })
          return { success: true, id: params.id }
        },
      }),

      batchUpdateStatus: tool({
        description: 'Update status of multiple work items at once (e.g., dismiss multiple learnings)',
        parameters: z.object({
          ids: z.array(z.string()).describe('Work item IDs'),
          status: z.enum(['queued', 'active', 'waiting', 'done', 'blocked']),
        }),
        execute: async (params) => {
          const results = []
          for (const id of params.ids) {
            try {
              await updateThinkgraphWorkItem(id, team.id, 'system', { status: params.status }, { role: 'admin' })
              results.push({ id, success: true })
            } catch (err: any) {
              results.push({ id, success: false, error: err.message })
            }
          }
          return { updated: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }
        },
      }),

      arrangeNodes: tool({
        description: 'Arrange nodes on the canvas by setting their positions. Use this to group related items, clean up layout, or organize by status. Typical spacing: 300px horizontal, 200px vertical between nodes.',
        parameters: z.object({
          positions: z.array(z.object({
            id: z.string().describe('Work item ID'),
            x: z.number().describe('X position on canvas'),
            y: z.number().describe('Y position on canvas'),
          })),
        }),
        execute: async (params) => {
          if (!flowId) return { success: false, error: 'No flow ID available' }

          const db = useDB()

          // Read existing positions
          const [existing] = await (db as any)
            .select({ nodePositions: flowConfigs.nodePositions })
            .from(flowConfigs)
            .where(and(eq(flowConfigs.id, flowId), eq(flowConfigs.teamId, team.id)))
            .limit(1)

          if (!existing) return { success: false, error: 'Flow config not found' }

          const merged = {
            ...(existing.nodePositions as Record<string, { x: number; y: number }> || {}),
          }
          for (const p of params.positions) {
            merged[p.id] = { x: Math.round(p.x), y: Math.round(p.y) }
          }

          await (db as any)
            .update(flowConfigs)
            .set({ nodePositions: merged })
            .where(eq(flowConfigs.id, flowId))

          return { success: true, moved: params.positions.length }
        },
      }),
    },
    maxSteps: 5,
  })

  return result.toDataStreamResponse()
})
