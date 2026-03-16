import { streamText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '../../../../../../layers/thinkgraph/collections/decisions/server/database/queries'
import { buildAncestorChain, buildPrompt } from '~~/server/utils/context-builder'

const modeConfig: Record<string, { system: string; count: number }> = {
  diverge: {
    count: 5,
    system: `You generate diverse alternative approaches. For each, provide a fresh angle that hasn't been considered.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "idea"|"question"|"observation"|"decision", "pathType": "explored"}`
  },
  deep_dive: {
    count: 4,
    system: `You go deep on a topic — implications, edge cases, trade-offs, second-order effects.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "insight"|"question"|"observation", "pathType": "explored"}`
  },
  prototype: {
    count: 3,
    system: `You create practical, actionable steps. Be specific — names, tools, concrete approaches.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "idea"|"decision", "pathType": "explored"}`
  },
  converge: {
    count: 2,
    system: `You synthesize multiple ideas into unified approaches. Find the common thread and create a coherent strategy.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "decision", "pathType": "chosen"}`
  },
  validate: {
    count: 4,
    system: `You stress-test ideas. Find holes, risks, blind spots, and counterarguments. Be constructively critical.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "question", "pathType": "pending"}`
  },
  default: {
    count: 3,
    system: `You help users explore decisions by generating diverse perspectives.
Generate exactly 3 child nodes:
1. A supporting perspective (nodeType: "idea")
2. A challenging question (nodeType: "question")
3. An alternative angle (nodeType: "observation")
Respond ONLY with valid JSON array. Each item: {"content": "...", "nodeType": "...", "pathType": "explored"}`
  }
}

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const decisionId = getRouterParam(event, 'decisionId')

  if (!decisionId) {
    throw createError({ status: 400, statusText: 'Decision ID required' })
  }

  const body = await readBody(event).catch(() => ({}))
  const mode = (body?.mode as string) || 'default'
  const config = modeConfig[mode] || modeConfig.default

  const allDecisions = await getAllThinkgraphDecisions(team.id)
  const targetDecision = allDecisions.find((d: any) => d.id === decisionId)

  if (!targetDecision) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  const ancestors = buildAncestorChain(allDecisions, decisionId)
  const ancestorIds = new Set(ancestors.map((a: any) => a.id))
  const siblings = allDecisions.filter((d: any) => d.parentId === targetDecision.parentId && d.id !== decisionId)
  const children = allDecisions.filter((d: any) => d.parentId === decisionId)
  const starred = allDecisions.filter((d: any) => d.starred && d.id !== decisionId)
  const pinned = allDecisions.filter((d: any) => d.pinned && d.id !== decisionId && !ancestorIds.has(d.id))

  const ai = createAIProvider(event)

  const result = await streamText({
    model: ai.model(ai.getDefaultModel()),
    system: config.system + `\n\nKeep each content to 1-2 sentences. Be concise but insightful.`,
    prompt: buildPrompt(targetDecision, ancestors, siblings, children, starred, config.count, pinned),
  })

  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  let perspectives: Array<{ content: string; nodeType: string; pathType: string }>
  try {
    const jsonMatch = fullText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found')
    perspectives = JSON.parse(jsonMatch[0])
  } catch {
    throw createError({ status: 500, statusText: 'AI returned invalid response' })
  }

  const created = []
  for (const p of perspectives) {
    const decision = await createThinkgraphDecision({
      content: p.content,
      nodeType: p.nodeType || 'idea',
      pathType: p.pathType || 'explored',
      parentId: decisionId,
      source: 'ai',
      model: ai.getDefaultModel(),
      starred: false,
      branchName: '',
      versionTag: '',
      teamId: team.id,
      owner: user.id,
    } as any)
    created.push(decision)
  }

  return created
})
