/**
 * POST /api/admin/backfill-embeddings
 *
 * Walks all thinkgraph_nodes for a team (or every team) and indexes them
 * into the Vectorize index. Idempotent — same nodeId always overwrites.
 *
 * Auth: requires the admin secret. Set ADMIN_BACKFILL_SECRET as a Pages
 * env var (or NUXT_ADMIN_BACKFILL_SECRET) and pass it in the
 * `x-admin-secret` header. Without the secret env var set the endpoint
 * refuses to run, so accidental public exposure is impossible.
 *
 * Body:
 *   { teamId?: string }   // optional — restrict to one team
 *
 * Triggered by `apps/thinkgraph/scripts/backfill-embeddings.ts`.
 */
import { sql } from 'drizzle-orm'
import { thinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/schema'
import { indexNode } from '~~/server/utils/embeddings'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const expectedSecret = (config.adminBackfillSecret || process.env.NUXT_ADMIN_BACKFILL_SECRET || process.env.ADMIN_BACKFILL_SECRET) as string | undefined

  if (!expectedSecret) {
    throw createError({ status: 503, statusText: 'Backfill disabled — set NUXT_ADMIN_BACKFILL_SECRET' })
  }
  const provided = getHeader(event, 'x-admin-secret')
  if (provided !== expectedSecret) {
    throw createError({ status: 401, statusText: 'Invalid admin secret' })
  }

  const body = await readBody(event).catch(() => ({}))
  const { teamId } = (body || {}) as { teamId?: string }

  const db = useDB()
  const rows = teamId
    ? await (db as any)
        .select({ id: thinkgraphNodes.id, teamId: thinkgraphNodes.teamId })
        .from(thinkgraphNodes)
        .where(sql`${thinkgraphNodes.teamId} = ${teamId}`)
    : await (db as any)
        .select({ id: thinkgraphNodes.id, teamId: thinkgraphNodes.teamId })
        .from(thinkgraphNodes)

  let indexed = 0
  let skipped = 0
  let failed = 0
  const errors: Array<{ nodeId: string, error: string }> = []

  for (const row of rows as Array<{ id: string, teamId: string }>) {
    try {
      const result = await indexNode(row.id, row.teamId, event)
      if (result.indexed) indexed++
      else skipped++
    }
    catch (err: any) {
      failed++
      errors.push({ nodeId: row.id, error: err?.message || String(err) })
    }
  }

  return {
    total: rows.length,
    indexed,
    skipped,
    failed,
    errors: errors.slice(0, 20),
  }
})
