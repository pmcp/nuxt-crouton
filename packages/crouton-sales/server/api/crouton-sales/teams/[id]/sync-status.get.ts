/**
 * Sync status (freshness) endpoint for the online dashboard (#179, epic #175).
 *
 * Returns the cloud's D1-mirror heartbeat — when the venue Pi last checked in —
 * so the live dashboard can render "last synced Xs ago" and flag staleness when
 * the Pi is offline. Read-only; team-members-only (mirror data is team-scoped).
 *
 * `serverNow` is included so the client computes age against the *server's*
 * clock, immune to device clock skew. The heartbeat is a single global row
 * (one venue Pi → one cloud deploy), so this is team-gated for access but not
 * team-keyed in storage — see server/database/schema.ts.
 */
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { readSyncStatus } from '../../../../utils/sync-status'

export default defineEventHandler(async (event) => {
  await resolveTeamAndCheckMembership(event)
  const db = useDB()

  const status = await readSyncStatus(db)

  return {
    lastContactAt: status.lastContactAt ? status.lastContactAt.getTime() : null,
    lastEventAt: status.lastEventAt ? status.lastEventAt.getTime() : null,
    lastBatchApplied: status.lastBatchApplied,
    serverNow: Date.now(),
  }
})
