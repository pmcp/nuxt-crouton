/**
 * Spooler-callback: mark a print job as successfully completed.
 */
import { eq, and, ne, count } from 'drizzle-orm'
import { requirePrintServerKey } from '../../../../utils/print-server-auth'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'

const STATUS_COMPLETED = '2'

export default defineEventHandler(async (event) => {
  requirePrintServerKey(event)

  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ status: 400, statusText: 'Job ID is required' })
  }

  const db = useDB()
  const now = new Date()

  // completedAt is a text column (cli regression: schema says datetime but
  // gets generated as text). Pass an ISO string so drizzle/SQLite store it
  // cleanly instead of the long Date.toString() format which trips D1.
  // updatedAt is a real integer({mode:'timestamp'}) column, so a Date is fine.
  const result = await db
    .update(salesPrintqueues)
    .set({ status: STATUS_COMPLETED, completedAt: now.toISOString(), updatedAt: now })
    .where(eq(salesPrintqueues.id, jobId))
    .returning({ id: salesPrintqueues.id, orderId: salesPrintqueues.orderId })

  if (result.length === 0) {
    throw createError({ status: 404, statusText: 'Print job not found' })
  }

  // Auto-complete the order once all of its print jobs are done. Printing the
  // ticket is the start of fulfillment, but the chosen workflow treats "all
  // tickets printed" as "order completed". We only flip when no remaining job
  // for this order is in a non-completed state (pending/printing/failed), so a
  // failed ticket keeps the order out of 'completed' until it's reprinted.
  const orderId = result[0]?.orderId
  let orderCompleted = false
  if (orderId) {
    const [remaining] = await db
      .select({ n: count() })
      .from(salesPrintqueues)
      .where(and(
        eq(salesPrintqueues.orderId, orderId),
        ne(salesPrintqueues.status, STATUS_COMPLETED)
      ))

    if (!remaining || remaining.n === 0) {
      await db
        .update(salesOrders)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(salesOrders.id, orderId))
      orderCompleted = true
    }
  }

  return { success: true, id: jobId, orderCompleted }
})
