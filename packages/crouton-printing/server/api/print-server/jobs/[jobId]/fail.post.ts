/**
 * Spooler-callback: mark a print job as failed and bump retry count.
 * Also flags the order as print_failed so the orders list surfaces the
 * problem (the complete callback flips it to completed once a resend
 * succeeds for all of the order's jobs).
 */
import { eq, sql, and, notInArray } from 'drizzle-orm'
import { requirePrintServerKey } from '../../../../utils/print-server-auth'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'

const STATUS_FAILED = '9'

export default defineEventHandler(async (event) => {
  requirePrintServerKey(event)

  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ status: 400, statusText: 'Job ID is required' })
  }

  const body = await readBody<{ errorMessage?: string }>(event).catch(() => null)
  const errorMessage = body?.errorMessage || 'Print job failed'

  const db = useDB()

  const result = await db
    .update(salesPrintqueues)
    .set({
      status: STATUS_FAILED,
      errorMessage,
      retryCount: sql`COALESCE(${salesPrintqueues.retryCount}, 0) + 1`,
      updatedAt: new Date()
    })
    .where(eq(salesPrintqueues.id, jobId))
    .returning({ id: salesPrintqueues.id, orderId: salesPrintqueues.orderId })

  if (result.length === 0) {
    throw createError({ status: 404, statusText: 'Print job not found' })
  }

  // Surface the failure on the order itself — "pending" hides a printer
  // error from staff. Completed/cancelled orders are left untouched.
  const orderId = result[0]?.orderId
  if (orderId) {
    await db
      .update(salesOrders)
      .set({ status: 'print_failed', updatedAt: new Date() })
      .where(
        and(
          eq(salesOrders.id, orderId),
          notInArray(salesOrders.status, ['completed', 'cancelled'])
        )
      )
  }

  return { success: true, id: jobId, errorMessage }
})
