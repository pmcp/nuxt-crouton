/**
 * Slim per-order print job status for the POS checkout button's print watcher.
 *
 * Helper-token equivalent of the team-authed `printqueues/status` GET: any
 * token that could create the order can watch it print. Returns only that
 * order's jobs with the printer name joined server-side — the volunteer UI
 * has no printers query to enrich from. An empty array is a real answer
 * (the order generated no tickets), not an error.
 */
import { eq } from 'drizzle-orm'
import { requireScopedAccessToResource } from '@fyit/crouton-auth/server/utils/scoped-access'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesPrinters } from '~~/layers/sales/collections/printers/server/database/schema'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  const orderId = getRouterParam(event, 'orderId')

  if (!eventId || !orderId) {
    throw createError({ status: 400, statusText: 'Event ID and Order ID are required' })
  }

  await requireScopedAccessToResource(event, 'event', eventId)
  const db = useDB()

  const [order] = await db
    .select({ id: salesOrders.id, eventId: salesOrders.eventId })
    .from(salesOrders)
    .where(eq(salesOrders.id, orderId))
    .limit(1)

  if (!order || order.eventId !== eventId) {
    throw createError({ status: 404, statusText: 'Order not found' })
  }

  return db
    .select({
      id: salesPrintqueues.id,
      status: salesPrintqueues.status,
      errorMessage: salesPrintqueues.errorMessage,
      retryCount: salesPrintqueues.retryCount,
      printMode: salesPrintqueues.printMode,
      printerTitle: salesPrinters.title,
      completedAt: salesPrintqueues.completedAt
    })
    .from(salesPrintqueues)
    .leftJoin(salesPrinters, eq(salesPrintqueues.printerId, salesPrinters.id))
    .where(eq(salesPrintqueues.orderId, orderId))
})
