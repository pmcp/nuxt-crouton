import { streamText } from 'ai'
import { getAllThinkgraphWorkItems } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'
import { getAllThinkgraphProjects } from '~~/layers/thinkgraph/collections/projects/server/database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

/**
 * Project assistant chat endpoint.
 * Has full context of the project's work items and status.
 *
 * POST /api/teams/[id]/project-assistant
 * Body: { messages, projectId }
 */
export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const { messages, projectId } = await readBody(event)

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

  const learnings = projectItems
    .filter((i: any) => i.type === 'review' && i.assignee === 'human' && i.status === 'queued')
    .map((i: any) => `- [${i.title}]: ${i.brief || '(no detail)'}`)

  const activeItems = projectItems
    .filter((i: any) => i.status === 'active')
    .map((i: any) => `- ${i.title} (${i.type}, assignee: ${i.assignee})`)

  const doneItems = projectItems
    .filter((i: any) => i.status === 'done')
    .map((i: any) => `- ${i.title} (${i.type})${i.output ? ': ' + i.output.slice(0, 100) : ''}`)

  const systemPrompt = `You are the ThinkGraph project assistant for "${project?.name || 'Unknown'}".

## Project
- Name: ${project?.name}
- Client: ${project?.clientName || 'N/A'}
- Status: ${project?.status}
- Description: ${project?.description || 'N/A'}

## Work Items Summary
Total: ${projectItems.length} | ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}

## Currently Active (${activeItems.length})
${activeItems.join('\n') || 'None'}

## Completed (${doneItems.length})
${doneItems.join('\n') || 'None'}

## Learnings Pending Triage (${learnings.length})
${learnings.join('\n') || 'None'}

## Your Role
- Help the user decide what to do next
- Triage learnings: which are actionable and should become tasks?
- Suggest which skills/prompts to improve based on patterns in learnings
- Recommend the next work item to create or dispatch
- Keep answers concise and actionable — this is a PM tool, not a conversation

When suggesting a next action, format it as:
ACTION: <type> — <title>
BRIEF: <what the work item should do>
`

  const result = await streamText({
    model: ai.model('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages,
  })

  return result.toDataStreamResponse()
})
