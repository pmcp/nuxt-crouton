/**
 * Read-only preview of a client's open tab: the aggregated receipt lines the
 * end-receipt would print (identical product+price+options lines merged).
 * Backs the expandable rows in the workspace clients panel.
 */
import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { aggregateClientTab } from '../../../../../../../../utils/client-tab'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')
  const clientId = getRouterParam(event, 'clientId')

  if (!eventId || !clientId) {
    throw createError({ status: 400, statusText: 'Event ID and Client ID are required' })
  }

  const db = useDB()

  // Team scoping: the event must belong to the caller's team — the tab
  // aggregation itself only filters orders on eventId + clientId.
  const [salesEvent] = await db
    .select({ id: salesEvents.id })
    .from(salesEvents)
    .where(and(eq(salesEvents.id, eventId), eq(salesEvents.teamId, team.id)))
    .limit(1)

  if (!salesEvent) {
    throw createError({ status: 404, statusText: 'Event not found' })
  }

  const { orderIds, lines, total } = await aggregateClientTab(db, eventId, clientId)
  return { lines, orderCount: orderIds.length, total }
})
