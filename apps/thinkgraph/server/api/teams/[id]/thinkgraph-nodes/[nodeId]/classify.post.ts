import { generateText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getThinkgraphNodesByIds, updateThinkgraphNode } from '../../../../../../layers/thinkgraph/collections/nodes/server/database/queries'

const TEMPLATE_STEPS: Record<string, string[]> = {
  idea: [],
  research: ['analyse'],
  task: ['analyst', 'builder', 'reviewer', 'merger'],
  feature: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
  meta: ['analyst', 'builder', 'reviewer', 'merger'],
}

const VALID_TEMPLATES = ['idea', 'research', 'task', 'feature', 'meta'] as const
const VALID_ACTIONS = ['decompose', 'dispatch', 'idle'] as const

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
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

  const { text } = await generateText({
    model: ai.model('claude-haiku-4-5-20251001'),
    system: `You classify nodes. Respond with ONLY a JSON object, no other text.

Given a node's title and brief, return:
{
  "template": "idea" | "research" | "task" | "feature" | "meta",
  "action": "decompose" | "dispatch" | "idle",
  "reasoning": "one sentence"
}

Templates: idea = raw thought. research = needs investigation. task = concrete work. feature = multi-step deliverable. meta = about the process itself.

Actions:
- "decompose" = content is a structured plan with multiple actionable items that should become child nodes
- "dispatch" = single focused item ready for AI execution
- "idle" = raw thought or note, no immediate action needed

Prefer decompose when content has structure (headers, lists, phases). Prefer dispatch for focused items. Prefer idle for short thoughts.`,
    prompt: content,
  })

  // Parse response
  let parsed: { template: string; action: string; reasoning: string }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    // Fallback
    return { template: node.template || 'idea', action: 'idle', reasoning: 'Failed to parse AI response' }
  }

  const template = VALID_TEMPLATES.includes(parsed.template as any) ? parsed.template : 'idea'
  const action = VALID_ACTIONS.includes(parsed.action as any) ? parsed.action : 'idle'

  // Update the node with detected template + steps
  const steps = TEMPLATE_STEPS[template] || []
  await updateThinkgraphNode(nodeId, team.id, user.id, {
    template,
    steps,
  } as any, { role: 'admin' })

  return {
    template,
    steps,
    action,
    reasoning: parsed.reasoning || '',
  }
})
