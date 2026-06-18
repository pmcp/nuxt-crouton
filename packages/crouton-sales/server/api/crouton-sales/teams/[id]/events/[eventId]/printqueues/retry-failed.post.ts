/**
 * Requeue missed print jobs for an event (optionally one printer) so the
 * transport picks them up again on its next drain — used after a printer
 * recovers (paper reloaded, cover closed, back online).
 *
 * Reads/writes the generic crouton-printing `print_jobs` queue (epic #325)
 * filtered to this team's sales jobs. Covers two cases:
 * - failed jobs (status 9)
 * - jobs stuck at "printing" (status 1) for over 2 minutes — the transport
 *   fetched them (which flips the status) but its completion callback never
 *   landed (crash, network drop, truncated poll response).
 */
import { eq, and, or, lt } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { printJobs } from '@fyit/crouton-printing/server/database/schema'

const STATUS_PENDING = '0'
const STATUS_PRINTING = '1'
const STATUS_FAILED = '9'
const STALE_PRINTING_MS = 2 * 60 * 1000

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const body = await readBody<{ printerId?: string, jobId?: string }>(event).catch(() => null)

  const staleBefore = new Date(Date.now() - STALE_PRINTING_MS)
  const conditions = [
    eq(printJobs.teamId, team.id),
    eq(printJobs.eventId, eventId),
    eq(printJobs.source, 'sales'),
    or(
      eq(printJobs.status, STATUS_FAILED),
      and(
        eq(printJobs.status, STATUS_PRINTING),
        lt(printJobs.updatedAt, staleBefore)
      )
    )!
  ]
  if (body?.printerId) {
    conditions.push(eq(printJobs.printerId, body.printerId))
  }
  // Single-job retry (the per-line button in the expanded order).
  if (body?.jobId) {
    conditions.push(eq(printJobs.id, body.jobId))
  }

  const db = useDB()

  const requeued = await db
    .update(printJobs)
    .set({ status: STATUS_PENDING, errorMessage: null, updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: printJobs.id })

  return { success: true, requeued: requeued.length }
})
