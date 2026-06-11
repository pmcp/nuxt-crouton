/**
 * Active clients with their open tab for one event: order count + total.
 * Backs the workspace clients panel ("show clients" → settle a tab).
 * Only clients that placed at least one non-cancelled order appear — a
 * client with nothing ordered has nothing to settle.
 */
import { eq, and, ne, countDistinct, sql, asc } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { salesClients } from '~~/layers/sales/collections/clients/server/database/schema'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'
import { salesOrderitems } from '~~/layers/sales/collections/orderitems/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const db = useDB()

  const clients = await db
    .select({
      id: salesClients.id,
      title: salesClients.title,
      orderCount: countDistinct(salesOrders.id),
      total: sql<number>`coalesce(sum(${salesOrderitems.totalPrice}), 0)`
    })
    .from(salesClients)
    .innerJoin(salesOrders, and(
      eq(salesOrders.clientId, salesClients.id),
      eq(salesOrders.eventId, eventId),
      ne(salesOrders.status, 'cancelled')
    ))
    .leftJoin(salesOrderitems, eq(salesOrderitems.orderId, salesOrders.id))
    .where(and(
      eq(salesClients.teamId, team.id),
      eq(salesClients.isActive, true)
    ))
    .groupBy(salesClients.id, salesClients.title)
    .orderBy(asc(salesClients.title))

  return { clients }
})
