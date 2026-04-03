import { generateObject } from 'ai'
import { z } from 'zod'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getThinkgraphNodesByIds, updateThinkgraphNode } from '../../../../../../layers/thinkgraph/collections/nodes/server/database/queries'

const TEMPLATE_STEPS: Record<string, string[]> = {
  idea: [],
  research: ['analyse'],
  task: ['analyst', 'builder', 'reviewer', 'merger'],
  feature: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
  meta: ['analyst', 'builder', 'reviewer', 'merger'],
}

const classifySchema = z.object({
  template: z.enum(['idea', 'research', 'task', 'feature', 'meta']).describe(
    'The type of node. idea = raw thought/brainstorm. research = needs investigation. task = concrete work item. feature = multi-step deliverable. meta = about the graph/process itself.',
  ),
  action: z.enum(['decompose', 'dispatch', 'idle']).describe(
    'What to do next. decompose = content is a structured plan/brief that should be broken into child nodes. dispatch = ready to send to an AI worker for execution. idle = just store it, user will decide.',
  ),
  reasoning: z.string().describe('One sentence explaining why you chose this template and action.'),
})

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const nodeId = getRouterParam(event, 'nodeId')

  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Node ID required' })
  }

  const [node] = await getThinkgraphNodesByIds(team.id, [nodeId])
  if (!node) {
    throw createError({ status: 404, statusText: 'Node not found' })
  }

  const content = [node.title, node.brief].filter(Boolean).join('\n\n')

  // Short content — use fast regex detection, no AI needed
  if (content.length < 100 && !node.brief) {
    return { template: node.template || 'idea', action: 'idle', reasoning: 'Short content, no classification needed' }
  }

  const ai = createAIProvider(event)

  let object: { template: 'idea' | 'research' | 'task' | 'feature' | 'meta'; action: 'decompose' | 'dispatch' | 'idle'; reasoning: string }
  try {
    const result = await generateObject({
      model: ai.model(ai.getDefaultModel()),
      schema: classifySchema,
      system: `You classify ThinkGraph nodes. Given a node's title and brief, determine:
1. The appropriate template (idea/research/task/feature/meta)
2. The recommended next action:
   - "decompose" if the content is a structured plan, brief, or document with multiple actionable items that should become separate child nodes (phases, features, tasks, steps)
   - "dispatch" if it's a single focused item ready for AI execution (research question, task description, feature spec)
   - "idle" if it's a raw thought, question, or note that doesn't need immediate action

Prefer "decompose" when the content has clear structure (headers, lists, phases, numbered items).
Prefer "dispatch" for focused, single-purpose items.
Prefer "idle" for short thoughts, questions, or incomplete ideas.`,
      prompt: content,
    })
    object = result.object
  } catch (err: any) {
    console.error('AI classify failed:', err?.message || err)
    throw createError({ status: 500, statusText: `AI classify failed: ${err?.message || 'Unknown error'}` })
  }

  // Update the node with detected template + steps
  const steps = TEMPLATE_STEPS[object.template] || []
  await updateThinkgraphNode(team.id, nodeId, {
    template: object.template,
    steps,
  } as any)

  return {
    template: object.template,
    steps,
    action: object.action,
    reasoning: object.reasoning,
  }
})
