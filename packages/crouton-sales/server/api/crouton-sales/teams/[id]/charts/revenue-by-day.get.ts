/**
 * Revenue by Day chart endpoint
 *
 * Sums order-item revenue grouped by calendar day for the requesting team.
 * Optional ?eventId= narrows to a single event; omitted ⇒ team-wide.
 * Used by the salesChartBlock's `revenue-by-day` chart kind.
 */
import { and, eq, sql } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'
import { salesOrderitems } from '~~/layers/sales/collections/orderitems/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  const { eventId } = getQuery(event)
  const eventFilter = eventId ? eq(salesOrders.eventId, String(eventId)) : undefined

  // createdAt is an integer Unix-seconds timestamp → bucket by calendar day.
  const dateExpr = sql<string>`date(${salesOrders.createdAt}, 'unixepoch')`

  const rows = await db
    .select({
      date: dateExpr,
      revenue: sql<number>`sum(${salesOrderitems.totalPrice})`
    })
    .from(salesOrderitems)
    .innerJoin(salesOrders, eq(salesOrderitems.orderId, salesOrders.id))
    .where(and(eq(salesOrders.teamId, team.id), eventFilter))
    .groupBy(dateExpr)
    .orderBy(dateExpr)

  return {
    items: rows.map((r: { date: string, revenue: number }) => ({
      date: String(r.date),
      revenue: Number(r.revenue) || 0
    }))
  }
})
