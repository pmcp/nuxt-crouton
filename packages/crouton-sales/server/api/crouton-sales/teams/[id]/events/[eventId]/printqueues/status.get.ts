/**
 * Slim per-event print job status for the register overview's printer LEDs.
 *
 * The generated sales-printqueues GET returns every column — including each
 * job's full base64 ESC/POS payload — which is far too heavy to poll every
 * couple of seconds. This returns only the fields the LEDs/popovers render.
 */
import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const db = useDB()

  return db
    .select({
      id: salesPrintqueues.id,
      orderId: salesPrintqueues.orderId,
      printerId: salesPrintqueues.printerId,
      status: salesPrintqueues.status,
      errorMessage: salesPrintqueues.errorMessage,
      retryCount: salesPrintqueues.retryCount,
      createdAt: salesPrintqueues.createdAt,
      completedAt: salesPrintqueues.completedAt
    })
    .from(salesPrintqueues)
    .where(and(
      eq(salesPrintqueues.teamId, team.id),
      eq(salesPrintqueues.eventId, eventId)
    ))
})
