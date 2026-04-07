/**
 * POST /api/teams/[id]/thinkgraph-nodes/search-similar
 *
 * Body: { query: string, limit?: number, projectId?: string }
 * Returns hydrated node summaries ranked by semantic similarity.
 *
 * Uses Cloudflare Vectorize via server/utils/search-similar.ts.
 * In local dev (no VECTORIZE binding), returns { unavailable: true, results: [] }.
 */
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getThinkgraphNodesByIds } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { searchSimilar } from '~~/server/utils/search-similar'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const body = await readBody(event)
  const { query, limit, projectId } = body || {}

  if (!query || typeof query !== 'string') {
    throw createError({ status: 400, statusText: 'Missing required field: query (string)' })
  }

  const { hits, unavailable } = await searchSimilar(
    team.id,
    query,
    { limit: typeof limit === 'number' ? limit : 10, projectId },
    event,
  )

  if (hits.length === 0) {
    return { unavailable, results: [] }
  }

  // Hydrate matched nodes from D1 and preserve Vectorize ranking.
  const nodes = await getThinkgraphNodesByIds(team.id, hits.map(h => h.nodeId))
  const byId = new Map(nodes.map((n: any) => [n.id, n]))

  const results = hits
    .map((hit) => {
      const node = byId.get(hit.nodeId) as any
      if (!node) return null
      return {
        id: node.id,
        score: hit.score,
        title: node.title,
        summary: node.summary,
        status: node.status,
        template: node.template,
        projectId: node.projectId,
      }
    })
    .filter(Boolean)

  return { unavailable: false, results }
})
