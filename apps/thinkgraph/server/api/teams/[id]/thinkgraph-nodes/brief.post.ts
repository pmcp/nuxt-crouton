import { streamText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphNodes } from '../../../../../layers/thinkgraph/collections/nodes/server/database/queries'

const formatPrompts: Record<string, string> = {
  'markdown': 'Create a structured markdown document summarizing these decisions and insights. Use headers, bullet points, and clear sections. Group related ideas together.',
  'ai-prompt': 'Create a comprehensive AI prompt that captures the context, decisions, and current thinking state from these nodes. The prompt should allow any AI to continue this line of thinking without prior context.',
  'dev-brief': 'Create a developer brief suitable for Cursor, Lovable, or similar AI coding tools. Include: objective, key decisions made, constraints, technical requirements, and specific implementation guidance. Be actionable and concrete.',
}

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const body = await readBody(event)
  const { ids, format, graphId } = body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError({ status: 400, statusText: 'At least 1 node ID required' })
  }

  const validFormat = formatPrompts[format] ? format : 'markdown'

  const allDecisions = await getAllThinkgraphNodes(team.id, graphId || undefined)
  const selectedNodes = ids
    .map((id: string) => allDecisions.find((d: any) => d.id === id))
    .filter(Boolean)

  if (selectedNodes.length === 0) {
    throw createError({ status: 400, statusText: 'Could not find selected nodes' })
  }

  const ai = createAIProvider(event)

  const nodesText = selectedNodes.map((n: any, i: number) => {
    const parts = [`${i + 1}. ${n.content}`]
    parts.push(`   Type: ${n.nodeType}`)
    if (n.pathType) parts.push(`   Path: ${n.pathType}`)
    if (n.starred) parts.push(`   ⭐ Starred`)
    if (n.source) parts.push(`   Source: ${n.source}`)
    if (n.branchName && n.branchName !== 'main') parts.push(`   Branch: ${n.branchName}`)
    return parts.join('\n')
  }).join('\n\n')

  const result = await streamText({
    model: ai.model(ai.getDefaultModel()),
    system: formatPrompts[validFormat],
    prompt: `Generate a ${validFormat} from these ${selectedNodes.length} thinking graph nodes:\n\n${nodesText}`,
  })

  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  return { brief: fullText, format: validFormat }
})
