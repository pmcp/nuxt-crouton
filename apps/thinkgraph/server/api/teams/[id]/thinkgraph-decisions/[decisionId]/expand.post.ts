import { z } from 'zod/v3'
import { streamText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '../../../../../../layers/thinkgraph/collections/decisions/server/database/queries'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const decisionId = getRouterParam(event, 'decisionId')

  if (!decisionId) {
    throw createError({ status: 400, statusText: 'Decision ID required' })
  }

  // Get all decisions to build context
  const allDecisions = await getAllThinkgraphDecisions(team.id)
  const targetDecision = allDecisions.find((d: any) => d.id === decisionId)

  if (!targetDecision) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  // Build tree context for the AI
  const ancestors = buildAncestorChain(allDecisions, decisionId)
  const siblings = allDecisions.filter((d: any) => d.parentId === targetDecision.parentId && d.id !== decisionId)

  const ai = createAIProvider(event)

  const result = await streamText({
    model: ai.model(ai.getDefaultModel()),
    system: `You are a structured thinking assistant. You help users explore decisions by generating diverse perspectives.

When given a thought or decision, generate exactly 3 child nodes that explore different angles:
1. A supporting/pro perspective (nodeType: "idea")
2. A challenging/con perspective (nodeType: "question")
3. An alternative or unexpected angle (nodeType: "observation")

Respond ONLY with valid JSON array. Each item must have:
- "content": A concise thought (1-2 sentences max)
- "nodeType": One of "idea", "question", "observation", "decision"
- "pathType": One of "chosen", "explored", "rejected", "pending"

Example response:
[
  {"content": "This approach would reduce complexity by 40%", "nodeType": "idea", "pathType": "explored"},
  {"content": "What about edge cases with concurrent users?", "nodeType": "question", "pathType": "pending"},
  {"content": "We could combine both approaches using a facade pattern", "nodeType": "observation", "pathType": "explored"}
]`,
    prompt: buildPrompt(targetDecision, ancestors, siblings),
  })

  // Collect the full streamed response
  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  // Parse the JSON response
  let perspectives: Array<{ content: string; nodeType: string; pathType: string }>
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = fullText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found')
    perspectives = JSON.parse(jsonMatch[0])
  } catch {
    throw createError({ status: 500, statusText: 'AI returned invalid response' })
  }

  // Create child decisions in the database
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
      createdBy: user.id,
      updatedBy: user.id,
    })
    created.push(decision)
  }

  return created
})

function buildAncestorChain(allDecisions: any[], targetId: string): any[] {
  const chain: any[] = []
  let current = allDecisions.find((d: any) => d.id === targetId)
  while (current?.parentId) {
    const parent = allDecisions.find((d: any) => d.id === current.parentId)
    if (!parent) break
    chain.unshift(parent)
    current = parent
  }
  return chain
}

function buildPrompt(target: any, ancestors: any[], siblings: any[]): string {
  let prompt = ''

  if (ancestors.length > 0) {
    prompt += 'Thinking chain so far:\n'
    ancestors.forEach((a, i) => {
      prompt += `${'  '.repeat(i)}→ ${a.content}\n`
    })
    prompt += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}\n\n`
  } else {
    prompt += `Starting thought: ${target.content}\n\n`
  }

  if (siblings.length > 0) {
    prompt += 'Sibling perspectives already explored:\n'
    siblings.forEach((s: any) => {
      prompt += `- ${s.content} (${s.nodeType})\n`
    })
    prompt += '\nGenerate 3 NEW perspectives that are different from the siblings above.\n'
  } else {
    prompt += 'Generate 3 diverse perspectives on this thought.\n'
  }

  return prompt
}
