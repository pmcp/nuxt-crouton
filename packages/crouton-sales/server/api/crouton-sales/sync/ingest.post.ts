/**
 * Cloud-side ingest for the D1 live mirror (#178, epic #175).
 *
 * Receives a batch of outbox events from the Pi pusher (#177) and applies them
 * as idempotent upserts into the mirrored tables. The only writer of mirrored
 * venue data on the cloud. Auth is a fail-closed shared secret (`x-sync-key`).
 *
 * Body:  { events: IngestEvent[] }
 * Reply: { applied: string[], skipped: [{ id, reason, permanent }] }
 *        — the pusher advances its cursor past `applied`, retries non-permanent
 *          skips, and may drop permanent ones.
 */
import { requireCloudSyncKey } from '../../../utils/cloud-sync-auth'
import { applyOutboxEvents, type IngestEvent } from '../../../utils/sync-ingest'

interface IngestBody {
  events?: IngestEvent[]
}

export default defineEventHandler(async (event) => {
  requireCloudSyncKey(event)

  const body = await readBody<IngestBody>(event)
  if (!body || !Array.isArray(body.events)) {
    throw createError({ status: 400, statusText: 'Body must be { events: [...] }' })
  }

  const db = useDB()
  const result = await applyOutboxEvents(db, body.events)

  return {
    received: body.events.length,
    appliedCount: result.applied.length,
    ...result,
  }
})
