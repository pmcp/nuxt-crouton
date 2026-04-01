import { streamText, tool } from 'ai'
import { z } from 'zod/v3'
import { eq, and } from 'drizzle-orm'
import { getAllThinkgraphNodes, createThinkgraphNode, updateThinkgraphNode, deleteThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { getAllThinkgraphProjects } from '~~/layers/thinkgraph/collections/projects/server/database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { buildNodeContext } from '~~/server/utils/context-builder'
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
  const { messages, projectId, flowId, focusedNodeId } = await readBody(event)

  if (!projectId) {
    throw createError({ status: 400, statusText: 'Missing projectId' })
  }

  const ai = createAIProvider(event)

  // Build project context
  const [allItems, allProjects] = await Promise.all([
    getAllThinkgraphNodes(team.id),
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
${focusedNodeId ? (() => {
  const focused = projectItems.find((i: any) => i.id === focusedNodeId)
  if (!focused) return ''
  return `
## Currently Focused Node
- ID: ${focused.id}
- Title: ${focused.title}
- Type: ${focused.type}
- Status: ${focused.status}
- Assignee: ${focused.assignee || 'pi'}
- Brief: ${focused.brief || '(none)'}
- Output: ${focused.output ? focused.output.slice(0, 500) : '(none)'}
- Parent: ${focused.parentId || '(root)'}

The user is asking about THIS specific node. Help them decide what to do with it.`
})() : ''}

## Node Types — Choose Correctly
| Type | When to use | What Pi does |
|------|------------|--------------|
| **discover** | Understand requirements, interview, research | Produces a structured brief |
| **architect** | Design schemas, pick packages, plan structure | Produces schemas + architecture doc |
| **generate** | Run crouton CLI to scaffold collections from schemas | Runs \`crouton config\`, creates migrations |
| **compose** | Build pages, wire components, write code, fix bugs | Writes Vue/TS code, no CLI scaffolding |
| **review** | Human triage, client feedback, learning nodes | Waits for human action |
| **deploy** | Deploy to Cloudflare, sync Pi worker | Runs deploy commands |

**Common mistake:** Using \`generate\` for code changes. If the task is writing/fixing code (not running crouton CLI), use \`compose\`. If it's a bug fix, also use \`compose\`.

## Your Role
You are a PM assistant with tools to take action. You can:
- Create, update, and delete work items
- Dispatch work items to Pi for execution (only queued, pi-assigned items)
- Arrange nodes on the canvas (group related items, clean up layout)
- Batch-dismiss learnings that aren't actionable
- Promote learnings to tasks

When the user asks to "dispatch all" or "run everything", create the items first, then dispatch each one sequentially.

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
          const item = await createThinkgraphNode({
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

          await updateThinkgraphNode(id, team.id, 'system', filtered, { role: 'admin' })
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

          await deleteThinkgraphNode(params.id, team.id, 'system', { role: 'admin' })
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
              await updateThinkgraphNode(id, team.id, 'system', { status: params.status }, { role: 'admin' })
              results.push({ id, success: true })
            } catch (err: any) {
              results.push({ id, success: false, error: err.message })
            }
          }
          return { updated: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }
        },
      }),

      dispatchWorkItem: tool({
        description: 'Dispatch a work item to Pi for execution. Sets status to active and sends to the Pi worker. Only dispatch pi-assigned items that are queued.',
        parameters: z.object({
          id: z.string().describe('Work item ID to dispatch'),
        }),
        execute: async (params) => {
          console.log(`[assistant] Dispatching work item ${params.id}`)
          // Re-fetch to get items created during this conversation (not stale snapshot)
          const freshItems = await getAllThinkgraphNodes(team.id)
          const item = freshItems.find((i: any) => i.id === params.id)
          if (!item) {
            console.log(`[assistant] Work item ${params.id} not found in ${freshItems.length} items`)
            return { success: false, error: 'Work item not found' }
          }
          console.log(`[assistant] Found item: ${item.title} (status: ${item.status}, assignee: ${item.assignee})`)
          if (item.status !== 'queued') return { success: false, error: `Item is ${item.status}, not queued` }
          if (item.assignee !== 'pi') return { success: false, error: `Item assigned to ${item.assignee}, not pi` }

          // Build context chain (use fresh items)
          const contextPayload = buildNodeContext(
            freshItems.map((i: any) => ({
              id: i.id, parentId: i.parentId, title: i.title,
              nodeType: i.type, status: i.status, brief: i.brief, output: i.output,
            })),
            params.id,
          )

          const handoffMeta = {
            type: 'handoff' as const,
            provider: 'pi',
            skill: item.skill || item.type,
            prompt: item.brief || item.title,
            context: contextPayload.markdown,
            contextTokens: contextPayload.tokenEstimate,
            projectId: item.projectId,
            workItemId: params.id,
            workItemTitle: item.title,
            workItemType: item.type,
            teamId: team.id,
            dispatchedBy: 'assistant',
            dispatchedAt: new Date().toISOString(),
          }

          // Store handoff + set active
          const existing = Array.isArray(item.artifacts) ? item.artifacts : []
          const cleaned = existing.filter((a: any) => a?.type !== 'handoff')

          await updateThinkgraphNode(params.id, team.id, 'system', {
            status: 'active',
            artifacts: [...cleaned, handoffMeta],
          }, { role: 'admin' })

          // Send to Pi worker
          const config = useRuntimeConfig()
          const piWorkerUrl = config.piWorkerUrl || 'https://pi-api.pmcp.dev'
          const host = getHeader(event, 'host') || 'localhost:3004'
          let piAccepted = false

          try {
            const resp = await $fetch<{ accepted: boolean }>(`${piWorkerUrl}/dispatch`, {
              method: 'POST',
              body: {
                workItemId: params.id,
                projectId: item.projectId,
                prompt: handoffMeta.prompt,
                context: contextPayload.markdown,
                skill: handoffMeta.skill,
                workItemType: item.type,
                teamId: team.id,
                teamSlug: team.slug || team.id,
                callbackUrl: `${config.public?.siteUrl || `http://${host}`}/api/teams/${team.id}/dispatch/webhook`,
              },
            })
            piAccepted = resp?.accepted || false
          } catch (err: any) {
            // Pi rejected or unreachable — reset to queued so it can be dispatched later
            await updateThinkgraphNode(params.id, team.id, 'system', {
              status: 'queued',
            }, { role: 'admin' })
            return { success: false, id: params.id, error: `Pi unavailable: ${err.message}. Item reset to queued.` }
          }

          return { success: true, id: params.id, piAccepted, skill: handoffMeta.skill }
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
    maxSteps: 15,
  })

  return result.toDataStreamResponse()
})
