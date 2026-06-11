/**
 * Requeue missed print jobs for an event (optionally one printer) so the
 * spooler picks them up again on its next poll — used after a printer
 * recovers (paper reloaded, cover closed, back online).
 *
 * Covers two cases:
 * - failed jobs (status 9)
 * - jobs stuck at "printing" (status 1) for over 2 minutes — the spooler
 *   fetched them (which flips the status) but its completion callback never
 *   landed (crash, network drop, truncated poll response).
 */
import { eq, and, or, lt } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'

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

  const body = await readBody<{ printerId?: string }>(event).catch(() => null)

  const staleBefore = new Date(Date.now() - STALE_PRINTING_MS)
  const conditions = [
    eq(salesPrintqueues.teamId, team.id),
    eq(salesPrintqueues.eventId, eventId),
    or(
      eq(salesPrintqueues.status, STATUS_FAILED),
      and(
        eq(salesPrintqueues.status, STATUS_PRINTING),
        lt(salesPrintqueues.updatedAt, staleBefore)
      )
    )!
  ]
  if (body?.printerId) {
    conditions.push(eq(salesPrintqueues.printerId, body.printerId))
  }

  const db = useDB()

  const requeued = await db
    .update(salesPrintqueues)
    .set({ status: STATUS_PENDING, errorMessage: null, updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: salesPrintqueues.id })

  return { success: true, requeued: requeued.length }
})
