import { z } from 'zod'
import { getThinkgraphNodesByIds } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { searchSimilar } from '~~/server/utils/search-similar'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Semantic search over thinkgraph nodes via Cloudflare Vectorize. Embeds the query and returns the most similar nodes by cosine distance — useful for finding prior work, related ideas, or duplicate briefs even when the wording is different. Falls back to an empty result set if Vectorize is unavailable.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    query: z.string().describe('Natural-language query to search for. The full text is embedded — be specific.'),
    limit: z.number().optional().default(10).describe('Max results (default 10)'),
    projectId: z.string().optional().describe('Optional projectId to scope the search to a single project'),
  },
  async handler({ teamId, query, limit, projectId }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)

      const { hits, unavailable } = await searchSimilar(
        resolvedTeamId,
        query,
        { limit: limit ?? 10, projectId },
      )

      if (unavailable) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ unavailable: true, results: [], note: 'Vectorize binding not available — semantic search is offline' }, null, 2),
          }],
        }
      }

      if (hits.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ results: [] }, null, 2) }] }
      }

      const nodes = await getThinkgraphNodesByIds(resolvedTeamId, hits.map(h => h.nodeId))
      const byId = new Map(nodes.map((n: any) => [n.id, n]))

      const results = hits
        .map((hit) => {
          const node = byId.get(hit.nodeId) as any
          if (!node) return null
          return {
            id: node.id,
            score: Number(hit.score.toFixed(4)),
            title: node.title,
            summary: node.summary,
            status: node.status,
            template: node.template,
            projectId: node.projectId,
          }
        })
        .filter(Boolean)

      return { content: [{ type: 'text' as const, text: JSON.stringify({ results }, null, 2) }] }
    }
    catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  },
})
