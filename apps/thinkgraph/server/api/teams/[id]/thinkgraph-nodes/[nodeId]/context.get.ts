import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphNodes } from '../../../../../../layers/thinkgraph/collections/nodes/server/database/queries'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const nodeId = getRouterParam(event, 'nodeId')
  const query = getQuery(event)
  const pathType = (query.pathType as string) || undefined

  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Decision ID required' })
  }

  const graphId = query.graphId ? String(query.graphId) : undefined
  const allDecisions = await getAllThinkgraphNodes(team.id, graphId)
  const target = allDecisions.find((d: any) => d.id === nodeId)

  if (!target) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  // Build ancestor chain
  const ancestors: any[] = []
  let current = target
  while (current?.parentId) {
    const parent = allDecisions.find((d: any) => d.id === current.parentId)
    if (!parent) break
    ancestors.unshift(parent)
    current = parent
  }

  // Get starred insights not in the chain
  const chainIds = new Set([...ancestors.map((a: any) => a.id), nodeId])
  const starred = allDecisions.filter((d: any) => d.starred && !chainIds.has(d.id))

  // Build context markdown
  const pathTemplates: Record<string, string> = {
    diverge: `Generate 5-10 different approaches to: ${target.content}`,
    deep_dive: `Go deep on: ${target.content}. Explore implications, edge cases, trade-offs.`,
    prototype: `Create a working prototype for: ${target.content}. Be specific and practical.`,
    converge: `Synthesize these insights into a unified approach: ${target.content}`,
    validate: `Challenge and stress-test this decision: ${target.content}. Find holes.`,
  }

  let md = `## Thinking path\n`
  ancestors.forEach((a: any, i: number) => {
    md += `${'  '.repeat(i)}→ ${a.content}\n`
  })
  md += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}\n`

  if (starred.length > 0) {
    md += `\n## Starred insights from other branches\n`
    starred.forEach((s: any) => {
      const branch = s.branchName ? ` (branch: ${s.branchName})` : ''
      md += `⭐ ${s.content}${branch}\n`
    })
  }

  if (pathType && pathTemplates[pathType]) {
    md += `\n## Task\n${pathTemplates[pathType]}\n`
  }

  md += `\n## Output format\nWhen you reach a key insight or decision, format it as:\nDECISION: {"content": "your insight", "nodeType": "idea"}\n`

  return {
    context: md,
    decision: target,
    ancestors,
    starred,
  }
})
