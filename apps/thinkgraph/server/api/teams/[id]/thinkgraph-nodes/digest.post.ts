import { streamText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphNodes } from '../../../../../layers/thinkgraph/collections/nodes/server/database/queries'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event).catch(() => ({}))
  const graphId = body?.graphId ? String(body.graphId) : undefined
  const allDecisions = await getAllThinkgraphNodes(team.id, graphId)

  if (!allDecisions || allDecisions.length === 0) {
    throw createError({ status: 400, statusText: 'No decisions found for this graph' })
  }

  // Build tree representation
  const treeText = buildTreeText(allDecisions)

  // Collect starred nodes
  const starred = allDecisions.filter((d: any) => d.starred)
  const starredText = starred.length > 0
    ? starred.map((d: any) => `- ${d.content} (${d.nodeType})`).join('\n')
    : 'None'

  const ai = createAIProvider(event)

  const result = await streamText({
    model: ai.model(ai.getDefaultModel()),
    system: `You are analyzing a thinking graph. Generate a concise digest (max 500 words) that a cold-start agent can read in 30 seconds to understand the current state.

Generate the following sections:
1. KEY DECISIONS (3-5 bullet points) - What has been decided?
2. ACTIVE TENSIONS (2-3 bullet points) - What contradictions or unresolved questions exist?
3. NEXT ACTIONS (3-5 bullet points) - What should be explored next?
4. THEMES (2-3 bullet points) - What are the main threads?

Also return a JSON object at the end with structured data:
{"sections": {"decisions": [...], "tensions": [...], "nextActions": [...], "themes": [...]}}

Be concise. Use direct language. No filler.`,
    prompt: `Graph structure:
${treeText}

Starred insights:
${starredText}

Total nodes: ${allDecisions.length}
Starred nodes: ${starred.length}`,
  })

  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  // Try to extract structured sections from JSON
  let sections = { decisions: [] as string[], tensions: [] as string[], nextActions: [] as string[], themes: [] as string[] }
  try {
    const jsonMatch = fullText.match(/\{[\s\S]*"sections"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.sections) {
        sections = parsed.sections
      }
    }
  } catch {
    // If JSON parsing fails, just return the raw digest text
  }

  // Clean the digest text by removing the JSON block
  const digest = fullText.replace(/\{[\s\S]*"sections"[\s\S]*\}/, '').trim()

  return { digest, sections }
})

function buildTreeText(decisions: any[]): string {
  // Find root nodes (no parent)
  const roots = decisions.filter((d: any) => !d.parentId)
  const childMap = new Map<string, any[]>()

  for (const d of decisions) {
    if (d.parentId) {
      const children = childMap.get(d.parentId) || []
      children.push(d)
      childMap.set(d.parentId, children)
    }
  }

  function renderNode(node: any, depth: number): string {
    const indent = '  '.repeat(depth)
    const star = node.starred ? ' [STARRED]' : ''
    const line = `${indent}- ${node.content} (${node.nodeType}${star})\n`
    const children = childMap.get(node.id) || []
    return line + children.map((c: any) => renderNode(c, depth + 1)).join('')
  }

  return roots.map((r: any) => renderNode(r, 0)).join('')
}
