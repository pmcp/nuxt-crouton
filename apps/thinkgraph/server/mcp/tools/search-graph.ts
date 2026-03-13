import { z } from 'zod'
import { getAllThinkgraphDecisions } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Search the thinking graph for nodes matching a query. Returns matching decisions with their context (parent chain, children, artifacts).',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    graphId: z.string().optional().describe('Graph ID to filter by'),
    query: z.string().describe('Search text (matches against node content)'),
    nodeType: z.enum(['idea', 'insight', 'decision', 'question']).optional().describe('Filter by node type'),
    limit: z.number().optional().default(10).describe('Max results'),
  },
  async handler({ teamId, graphId, query, nodeType, limit }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)
      const all = await getAllThinkgraphDecisions(resolvedTeamId, graphId)
      const q = query.toLowerCase()

      let matches = all.filter((d: any) =>
        d.content?.toLowerCase().includes(q)
      )

      if (nodeType) {
        matches = matches.filter((d: any) => d.nodeType === nodeType)
      }

      matches = matches.slice(0, limit)

      const results = matches.map((d: any) => {
        const parent = d.parentId ? all.find((p: any) => p.id === d.parentId) : null
        const children = all.filter((c: any) => c.parentId === d.id)
        return {
          id: d.id,
          content: d.content,
          nodeType: d.nodeType,
          starred: d.starred,
          source: d.source,
          parent: parent ? { id: parent.id, content: parent.content.slice(0, 100) } : null,
          childCount: children.length,
          hasArtifacts: d.artifacts?.length > 0,
        }
      })

      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  }
})
