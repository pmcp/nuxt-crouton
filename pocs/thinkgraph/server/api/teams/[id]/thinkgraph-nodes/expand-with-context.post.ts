import { streamText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphNodes, updateThinkgraphNode } from '../../../../../layers/thinkgraph/collections/nodes/server/database/queries'
import { buildAncestorChain, buildSelectedBranchContext } from '~~/server/utils/context-builder'

const modeConfig: Record<string, { system: string; count: number }> = {
  diverge: {
    count: 5,
    system: `You generate diverse alternative approaches. For each, provide a fresh angle that hasn't been considered.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "idea"|"question"|"observation"|"decision", "pathType": "explored"}`,
  },
  deep_dive: {
    count: 4,
    system: `You go deep on a topic — implications, edge cases, trade-offs, second-order effects.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "insight"|"question"|"observation", "pathType": "explored"}`,
  },
  prototype: {
    count: 3,
    system: `You create practical, actionable steps. Be specific — names, tools, concrete approaches.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "idea"|"decision", "pathType": "explored"}`,
  },
  converge: {
    count: 2,
    system: `You synthesize multiple ideas into unified approaches. Find the common thread and create a coherent strategy.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "decision", "pathType": "chosen"}`,
  },
  validate: {
    count: 4,
    system: `You stress-test ideas. Find holes, risks, blind spots, and counterarguments. Be constructively critical.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "question", "pathType": "pending"}`,
  },
  default: {
    count: 3,
    system: `You help users explore decisions by generating diverse perspectives.
Generate exactly 3 child nodes:
1. A supporting perspective (nodeType: "idea")
2. A challenging question (nodeType: "question")
3. An alternative angle (nodeType: "observation")
Respond ONLY with valid JSON array. Each item: {"content": "...", "nodeType": "...", "pathType": "explored"}`,
  },
}

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)
  const { nodeId, contextNodeIds, mode: rawMode, includeAncestors, graphId } = body

  if (!nodeId) {
    throw createError({ status: 400, statusText: 'nodeId required' })
  }
  if (!contextNodeIds || !Array.isArray(contextNodeIds) || contextNodeIds.length === 0) {
    throw createError({ status: 400, statusText: 'contextNodeIds required (non-empty array)' })
  }

  const mode = (rawMode as string) || 'default'
  const config = modeConfig[mode] || modeConfig.default

  const allDecisions = await getAllThinkgraphNodes(team.id, graphId || undefined)
  const targetDecision = allDecisions.find((d: any) => d.id === nodeId)

  if (!targetDecision) {
    throw createError({ status: 404, statusText: 'Target decision not found' })
  }

  // Build context from explicit selection
  const selectedContextNodes = contextNodeIds
    .map((id: string) => allDecisions.find((d: any) => d.id === id))
    .filter(Boolean)

  const ancestors = includeAncestors !== false
    ? buildAncestorChain(allDecisions, nodeId)
    : []

  const children = allDecisions.filter((d: any) => d.parentId === nodeId)

  // Build merged context prompt
  let prompt = buildSelectedBranchContext(targetDecision, selectedContextNodes, ancestors, allDecisions)

  if (children.length > 0) {
    prompt += 'Existing children (avoid duplicating these):\n'
    children.forEach((c: any) => {
      prompt += `- ${c.content} (${c.nodeType})\n`
    })
    prompt += '\n'
  }

  prompt += `Generate ${config.count} new perspectives. Be different from existing children. Use the selected context from other branches to inform your thinking.\n`

  const ai = createAIProvider(event)

  const result = await streamText({
    model: ai.model(ai.getDefaultModel()),
    system: config.system + `\n\nKeep each content to 1-2 sentences. Be concise but insightful. You have been given context from multiple branches of the thinking graph — use these cross-branch insights to generate richer, more informed perspectives.`,
    prompt,
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

  // Store as suggested nodes on the parent — user accepts from the slideout
  const suggestedNodes = perspectives.map(p => ({
    title: p.content,
    nodeType: p.nodeType || 'idea',
    brief: '',
    pathType: p.pathType || 'explored',
  }))

  const existingArtifacts = Array.isArray((targetDecision as any).artifacts)
    ? (targetDecision as any).artifacts.filter((a: any) => a?.type !== 'suggested-nodes')
    : []

  await updateThinkgraphNode(nodeId, team.id, user.id, {
    artifacts: [
      ...existingArtifacts,
      { type: 'suggested-nodes', nodes: suggestedNodes, createdAt: new Date().toISOString() },
    ],
  } as any, { role: 'admin' })

  return { suggestions: suggestedNodes }
})
