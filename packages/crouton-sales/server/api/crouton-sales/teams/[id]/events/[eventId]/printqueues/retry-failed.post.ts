/**
 * Requeue failed print jobs for an event (optionally one printer) so the
 * spooler picks them up again on its next poll — used after a printer
 * recovers (paper reloaded, cover closed, back online).
 */
import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'

const STATUS_PENDING = '0'
const STATUS_FAILED = '9'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const body = await readBody<{ printerId?: string }>(event).catch(() => null)

  const conditions = [
    eq(salesPrintqueues.teamId, team.id),
    eq(salesPrintqueues.eventId, eventId),
    eq(salesPrintqueues.status, STATUS_FAILED)
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
