import { generateText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getThinkgraphNodesByIds, updateThinkgraphNode } from '../../../../../../layers/thinkgraph/collections/nodes/server/database/queries'
import { NODE_TYPE_STEPS, normalizeNodeType, type ThinkgraphNodeType } from '~~/layers/thinkgraph/collections/nodes/types'

const VALID_TYPES: ThinkgraphNodeType[] = ['idea', 'discover', 'architect', 'generate', 'compose', 'review', 'deploy', 'meta']
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
    const normalized = normalizeNodeType(node.template)
    return { type: normalized, action: 'idle', reasoning: 'Short content, no classification needed' }
  }

  const ai = createAIProvider(event)

  const { text } = await generateText({
    model: ai.model('claude-haiku-4-5-20251001'),
    system: `You classify work items. Respond with ONLY a JSON object, no other text.

Given a node's title and brief, return:
{
  "type": "idea" | "discover" | "architect" | "generate" | "compose" | "review" | "deploy" | "meta",
  "action": "decompose" | "dispatch" | "idle",
  "reasoning": "one sentence"
}

Types:
- idea = raw thought, no action needed
- discover = needs research/investigation before building
- architect = needs design, schema planning, structure decisions
- generate = scaffold via crouton CLI (collections, CRUD)
- compose = write/fix code, build pages, wire components
- review = needs human triage or client feedback
- deploy = CI/CD, deployment, launch
- meta = about the ThinkGraph tool/pipeline itself

Actions:
- "decompose" = content is a structured plan with multiple actionable items that should become child nodes
- "dispatch" = single focused item ready for AI execution
- "idle" = raw thought or note, no immediate action needed

Prefer decompose when content has structure (headers, lists, phases). Prefer dispatch for focused items. Prefer idle for short thoughts.`,
    prompt: content,
  })

  // Parse response
  let parsed: { type: string; action: string; reasoning: string }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    const normalized = normalizeNodeType(node.template)
    return { type: normalized, action: 'idle', reasoning: 'Failed to parse AI response' }
  }

  const type = VALID_TYPES.includes(parsed.type as ThinkgraphNodeType) ? parsed.type as ThinkgraphNodeType : 'idea'
  const action = VALID_ACTIONS.includes(parsed.action as any) ? parsed.action : 'idle'

  // Update the node with detected type + steps
  const steps = NODE_TYPE_STEPS[type] || []
  await updateThinkgraphNode(nodeId, team.id, user.id, {
    template: type,
    steps,
  } as any, { role: 'admin' })

  return {
    type,
    steps,
    action,
    reasoning: parsed.reasoning || '',
  }
})
