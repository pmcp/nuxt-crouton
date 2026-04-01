import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphNodes } from '../../../../../layers/thinkgraph/collections/nodes/server/database/queries'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const query = getQuery(event)
  const graphId = query.graphId ? String(query.graphId) : undefined
  const allDecisions = await getAllThinkgraphNodes(team.id, graphId)

  if (allDecisions.length === 0) {
    return {
      briefing: '# Graph Resume\n\nNo decisions found in this graph.',
      stats: { total: 0, starred: 0, recent: 0, openQuestions: 0 },
    }
  }

  // 1. Starred nodes (important decisions/insights)
  const starred = allDecisions.filter((d: any) => d.starred)

  // 2. Recent nodes (last 24 hours) — use order as proxy since createdAt doesn't exist
  // Sort by order descending to get most recent
  const sorted = [...allDecisions].sort((a: any, b: any) => (b.order ?? 0) - (a.order ?? 0))
  const recent = sorted.slice(0, 10)

  // 3. Root nodes (top-level themes)
  const roots = allDecisions.filter((d: any) => !d.parentId)

  // 4. Open questions (nodes with nodeType 'question' that have no children)
  const parentIds = new Set(allDecisions.map((d: any) => d.parentId).filter(Boolean))
  const openQuestions = allDecisions.filter(
    (d: any) => d.nodeType === 'question' && !parentIds.has(d.id),
  )

  // 5. Leaf nodes (potential continuation points)
  const leaves = allDecisions.filter((d: any) => !parentIds.has(d.id))

  // Build markdown briefing
  let briefing = `# Graph Resume\n\n`
  briefing += `**${allDecisions.length} nodes** | ${roots.length} root themes | ${leaves.length} leaf nodes\n\n`

  if (starred.length > 0) {
    briefing += '## Key Decisions & Insights (starred)\n\n'
    for (const s of starred) {
      briefing += `- **[${s.nodeType}]** ${s.content}\n`
    }
    briefing += '\n'
  }

  if (recent.length > 0) {
    briefing += '## Most Recent Nodes\n\n'
    for (const r of recent) {
      const star = r.starred ? ' ⭐' : ''
      briefing += `- [${r.nodeType}] ${r.content.slice(0, 120)}${r.content.length > 120 ? '...' : ''}${star}\n`
    }
    briefing += '\n'
  }

  if (openQuestions.length > 0) {
    briefing += '## Open Questions\n\n'
    for (const q of openQuestions) {
      briefing += `- ${q.content}\n`
    }
    briefing += '\n'
  }

  // Graph structure summary
  briefing += '## Graph Structure\n\n'
  briefing += `- ${roots.length} root themes\n`
  briefing += `- ${starred.length} starred insights\n`
  briefing += `- ${openQuestions.length} open questions\n`
  briefing += `- ${leaves.length} leaf nodes (potential continuation points)\n\n`

  // Top-level themes with child counts
  briefing += '## Themes\n\n'
  for (const root of roots) {
    const childCount = allDecisions.filter((d: any) => d.parentId === root.id).length
    briefing += `- **${root.content}** (${childCount} children)\n`
  }

  return {
    briefing,
    stats: {
      total: allDecisions.length,
      starred: starred.length,
      recent: recent.length,
      openQuestions: openQuestions.length,
    },
  }
})
