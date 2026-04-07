/**
 * Semantic search over thinkgraph_nodes via Cloudflare Vectorize (Phase 2B).
 *
 * Embeds a query string with the same model used for indexing
 * (`text-embedding-3-small`, 1536 dims), queries the index scoped to
 * teamId (and optionally projectId), and returns ranked nodeIds + scores.
 *
 * Hydration is left to callers — this util only resolves the vector hits.
 */
import type { H3Event } from 'h3'
import { embedText, getVectorizeIndex } from './embeddings'

export interface SimilarSearchOptions {
  /** Max matches to return. Default 10. */
  limit?: number
  /** Optional projectId filter. */
  projectId?: string
}

export interface SimilarSearchHit {
  nodeId: string
  score: number
}

export interface SimilarSearchResult {
  hits: SimilarSearchHit[]
  /** True when the Vectorize binding wasn't available (local dev). */
  unavailable: boolean
}

export async function searchSimilar(
  teamId: string,
  query: string,
  options: SimilarSearchOptions = {},
  event?: H3Event,
): Promise<SimilarSearchResult> {
  if (!query || query.trim().length === 0) {
    return { hits: [], unavailable: false }
  }

  const index = getVectorizeIndex(event)
  if (!index) {
    return { hits: [], unavailable: true }
  }

  const vector = await embedText(query, event)

  const filter: Record<string, unknown> = { teamId }
  if (options.projectId) filter.projectId = options.projectId

  const result = await index.query(vector, {
    topK: options.limit ?? 10,
    filter,
    returnMetadata: 'indexed',
  })

  return {
    hits: (result.matches || []).map(m => ({ nodeId: m.id, score: m.score })),
    unavailable: false,
  }
}
