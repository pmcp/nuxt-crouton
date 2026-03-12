import { streamText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '../../../../../layers/thinkgraph/collections/decisions/server/database/queries'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const body = await readBody(event)
  const { nodeIds } = body

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length < 2) {
    throw createError({ status: 400, statusText: 'At least 2 node IDs required' })
  }

  const allDecisions = await getAllThinkgraphDecisions(team.id)
  const selectedNodes = nodeIds
    .map((id: string) => allDecisions.find((d: any) => d.id === id))
    .filter(Boolean)

  if (selectedNodes.length < 2) {
    throw createError({ status: 400, statusText: 'Could not find selected nodes' })
  }

  const ai = createAIProvider(event)

  const nodesText = selectedNodes.map((n: any, i: number) =>
    `${i + 1}. ${n.content} (${n.nodeType}${n.starred ? ', starred' : ''})`
  ).join('\n')

  const result = await streamText({
    model: ai.model(ai.getDefaultModel()),
    system: `You synthesize multiple ideas into a unified insight or decision. Find the common thread, resolve tensions, and create something greater than the sum of its parts.

Respond with a JSON object: {"content": "your synthesis (2-3 sentences)", "nodeType": "decision"|"insight"}`,
    prompt: `Synthesize these ${selectedNodes.length} nodes into a unified insight:\n\n${nodesText}\n\nCreate a single synthesis that captures the essence and resolves any tensions.`,
  })

  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  let synthesis: { content: string; nodeType: string }
  try {
    const jsonMatch = fullText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    synthesis = JSON.parse(jsonMatch[0])
  } catch {
    throw createError({ status: 500, statusText: 'AI returned invalid response' })
  }

  // Find common parent (or use first node's parent)
  const parentId = findCommonParent(allDecisions, nodeIds) || ''

  const decision = await createThinkgraphDecision({
    content: synthesis.content,
    nodeType: synthesis.nodeType || 'decision',
    pathType: 'chosen',
    parentId,
    source: 'ai',
    model: ai.getDefaultModel(),
    starred: true, // Syntheses are auto-starred
    branchName: '',
    versionTag: '',
    teamId: team.id,
    owner: user.id,
  } as any)

  return decision
})

function findCommonParent(allDecisions: any[], nodeIds: string[]): string | null {
  // Get parent chains for all nodes
  const chains = nodeIds.map((id: string) => {
    const chain: string[] = []
    let current = allDecisions.find((d: any) => d.id === id)
    while (current) {
      chain.unshift(current.id)
      current = current.parentId ? allDecisions.find((d: any) => d.id === current.parentId) : null
    }
    return chain
  })

  // Find deepest common ancestor
  let commonParent: string | null = null
  const shortest = Math.min(...chains.map(c => c.length))
  for (let i = 0; i < shortest; i++) {
    if (chains.every(c => c[i] === chains[0][i])) {
      commonParent = chains[0][i]
    } else {
      break
    }
  }

  return commonParent
}
