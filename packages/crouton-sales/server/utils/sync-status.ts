/**
 * @crouton-package crouton-sales
 * @description Cloud-side sync heartbeat for the D1 live mirror (#179, epic #175).
 *
 * The mirror is a copy of the venue till — a row reveals nothing about *when* it
 * arrived. The online dashboard (#179) needs to distinguish "the Pi is connected
 * and syncing now" from "the Pi went offline, this is a stale snapshot". This is
 * that signal: a single-row `sales_sync_status` heartbeat the cloud ingest (#178)
 * stamps on EVERY call — real data batches and the pusher's periodic idle ping
 * alike — plus a read used by the dashboard's status endpoint.
 *
 * Best-effort: `recordSyncHeartbeat` swallows its own errors so a heartbeat
 * write can never fail an otherwise-successful ingest (the mirrored data is what
 * matters; the freshness clock is advisory).
 *
 * The heartbeat schema is package-owned (`../database/schema`), imported lazily
 * to stay import-safe — same pattern as the pusher.
 */
import { eq } from 'drizzle-orm'

/** The single global heartbeat row id (one venue Pi → one cloud deploy). */
export const SYNC_STATUS_ROW_ID = 'live'

export interface SyncStatus {
  /** Last time the cloud heard from the Pi (data batch OR idle ping); null = never. */
  lastContactAt: Date | null
  /** Last time actual mirrored data was applied (applied > 0); null = never. */
  lastEventAt: Date | null
  /** Rows applied in the most recent non-empty batch. */
  lastBatchApplied: number
}

async function loadStatusSchema() {
  const { salesSyncStatus } = await import('../database/schema')
  return { salesSyncStatus }
}

/**
 * Stamp the heartbeat after an ingest call. `appliedCount` is how many events
 * the batch applied (0 for an idle ping). `lastContactAt` always advances;
 * `lastEventAt` + `lastBatchApplied` advance only when real data landed.
 *
 * Idempotent upsert of the single `'live'` row. Best-effort — never throws.
 */
export async function recordSyncHeartbeat(db: any, appliedCount: number): Promise<void> {
  try {
    const { salesSyncStatus } = await loadStatusSchema()
    const now = new Date()
    const applied = Number(appliedCount) || 0

    const base = { lastContactAt: now, updatedAt: now }
    const dataFields = applied > 0 ? { lastEventAt: now, lastBatchApplied: applied } : {}

    const updated = await db
      .update(salesSyncStatus)
      .set({ ...base, ...dataFields })
      .where(eq(salesSyncStatus.id, SYNC_STATUS_ROW_ID))
      .returning({ id: salesSyncStatus.id })

    if (updated.length === 0) {
      await db.insert(salesSyncStatus).values({
        id: SYNC_STATUS_ROW_ID,
        lastContactAt: now,
        lastEventAt: applied > 0 ? now : null,
        lastBatchApplied: applied,
        updatedAt: now,
      })
    }
  }
  catch (err: any) {
    console.warn('[crouton-sales] sync heartbeat write failed (ignored):', err?.message || err)
  }
}

/** Read the heartbeat for the dashboard's status endpoint. Null fields = never synced. */
export async function readSyncStatus(db: any): Promise<SyncStatus> {
  const { salesSyncStatus } = await loadStatusSchema()
  const [row] = await db
    .select()
    .from(salesSyncStatus)
    .where(eq(salesSyncStatus.id, SYNC_STATUS_ROW_ID))
    .limit(1)

  return {
    lastContactAt: row?.lastContactAt ?? null,
    lastEventAt: row?.lastEventAt ?? null,
    lastBatchApplied: row?.lastBatchApplied ?? 0,
  }
}
