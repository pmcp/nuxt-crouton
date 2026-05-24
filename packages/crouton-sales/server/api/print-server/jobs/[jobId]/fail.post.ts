/**
 * Spooler-callback: mark a print job as failed and bump retry count.
 */
import { eq, sql } from 'drizzle-orm'
import { requirePrintServerKey } from '../../../../utils/print-server-auth'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'

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
    .returning({ id: salesPrintqueues.id })

  if (result.length === 0) {
    throw createError({ status: 404, statusText: 'Print job not found' })
  }

  return { success: true, id: jobId, errorMessage }
})
