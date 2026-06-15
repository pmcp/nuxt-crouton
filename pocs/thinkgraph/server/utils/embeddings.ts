/**
 * Vector embeddings + Vectorize indexing for thinkgraph_nodes (Phase 2B).
 *
 * - Embeds node text via OpenAI `text-embedding-3-small` (1536 dims).
 * - Upserts to Cloudflare Vectorize keyed by nodeId, with metadata
 *   { teamId, projectId, status }.
 * - Fire-and-forget hooks (`indexNodeAsync`) are called from pipeline
 *   touchpoints alongside summary regeneration. Failures are logged,
 *   never propagated.
 *
 * Local dev: when the VECTORIZE binding is not present (no `wrangler dev`),
 * the indexer logs a one-line warning and no-ops. Search returns an empty
 * result set the same way. This keeps `nuxt dev` usable without Wrangler.
 */
import { embed } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { H3Event } from 'h3'
import { getThinkgraphNodesByIds } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

export interface NodeVectorMetadata {
  teamId: string
  projectId: string
  status: string
  [k: string]: unknown
}

interface VectorizeMatch {
  id: string
  score: number
  metadata?: NodeVectorMetadata
}

interface VectorizeQueryResult {
  matches: VectorizeMatch[]
  count?: number
}

interface VectorizeIndex {
  upsert(vectors: Array<{ id: string, values: number[], metadata?: Record<string, unknown> }>): Promise<unknown>
  query(vector: number[], options?: { topK?: number, filter?: Record<string, unknown>, returnMetadata?: boolean | 'all' | 'indexed' }): Promise<VectorizeQueryResult>
  deleteByIds(ids: string[]): Promise<unknown>
}

/**
 * Resolve the Vectorize binding from the Cloudflare runtime, if present.
 * Returns null in local dev (no wrangler) so callers can no-op cleanly.
 */
export function getVectorizeIndex(event?: H3Event): VectorizeIndex | null {
  // Cloudflare Pages runtime exposes bindings via event.context.cloudflare.env
  const fromEvent = (event as any)?.context?.cloudflare?.env?.VECTORIZE
  if (fromEvent) return fromEvent as VectorizeIndex

  // Some Nitro presets surface bindings as globals
  const fromGlobal = (globalThis as any).VECTORIZE
  if (fromGlobal) return fromGlobal as VectorizeIndex

  // Last-resort: process.env (works in some bundled targets)
  const fromProc = (process.env as any).VECTORIZE
  if (fromProc) return fromProc as VectorizeIndex

  return null
}

/**
 * Build the canonical text we embed for a node.
 * Combines title, summary, brief, and output — the human-meaningful content.
 */
export function buildNodeEmbeddingText(node: {
  title?: string | null
  summary?: string | null
  brief?: string | null
  output?: string | null
}): string {
  return [node.title, node.summary, node.brief, node.output]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join('\n\n')
    .slice(0, 8000) // text-embedding-3-small handles ~8K tokens; cap chars defensively
}

/**
 * Embed an arbitrary string with the configured embedding model.
 * Throws if no OpenAI API key is configured.
 */
export async function embedText(text: string, event?: H3Event): Promise<number[]> {
  const config = useRuntimeConfig(event)
  const apiKey = config.openaiApiKey as string | undefined
  if (!apiKey) {
    throw new Error('embeddings: OpenAI API key not configured (NUXT_OPENAI_API_KEY)')
  }
  const openai = createOpenAI({ apiKey })
  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: text,
  })
  return embedding
}

/**
 * Index (upsert) a single node into Vectorize.
 *
 * Idempotent: same nodeId always overwrites. Skips silently when:
 * - the node has no meaningful content yet
 * - the Vectorize binding is unavailable (local dev without wrangler)
 */
export async function indexNode(
  nodeId: string,
  teamId: string,
  event?: H3Event,
): Promise<{ indexed: boolean, reason?: string }> {
  const index = getVectorizeIndex(event)
  if (!index) {
    return { indexed: false, reason: 'no-binding' }
  }

  const [node] = await getThinkgraphNodesByIds(teamId, [nodeId])
  if (!node) return { indexed: false, reason: 'not-found' }

  const text = buildNodeEmbeddingText(node)
  if (text.length < 10) return { indexed: false, reason: 'empty-content' }

  const vector = await embedText(text, event)

  await index.upsert([
    {
      id: nodeId,
      values: vector,
      metadata: {
        teamId,
        projectId: node.projectId,
        status: node.status || 'idle',
      },
    },
  ])

  return { indexed: true }
}

/**
 * Fire-and-forget wrapper. Use at pipeline touchpoints so embedding work
 * never stalls a request. Errors are logged, not thrown.
 */
export function indexNodeAsync(
  nodeId: string,
  teamId: string,
  event?: H3Event,
): void {
  indexNode(nodeId, teamId, event)
    .then((result) => {
      if (!result.indexed && result.reason && result.reason !== 'no-binding' && result.reason !== 'empty-content') {
        console.warn(`[embeddings] node ${nodeId} not indexed: ${result.reason}`)
      }
      else if (!result.indexed && result.reason === 'no-binding') {
        // Only warn once per process
        if (!warnedNoBinding) {
          warnedNoBinding = true
          console.warn('[embeddings] VECTORIZE binding not available — semantic indexing disabled (local dev?)')
        }
      }
    })
    .catch((err) => {
      console.error(`[embeddings] failed to index node ${nodeId}:`, err instanceof Error ? err.message : err)
    })
}

let warnedNoBinding = false

/**
 * Remove a node's vector from the index. Called when a node is deleted.
 * No-ops if the binding is unavailable.
 */
export async function deleteNodeVector(nodeId: string, event?: H3Event): Promise<void> {
  const index = getVectorizeIndex(event)
  if (!index) return
  try {
    await index.deleteByIds([nodeId])
  }
  catch (err) {
    console.error(`[embeddings] failed to delete vector for node ${nodeId}:`, err instanceof Error ? err.message : err)
  }
}
