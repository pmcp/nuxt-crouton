/**
 * Spooler-callback: mark a print job as successfully completed.
 */
import { eq } from 'drizzle-orm'
import { requirePrintServerKey } from '../../../../utils/print-server-auth'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'

const STATUS_COMPLETED = '2'

export default defineEventHandler(async (event) => {
  requirePrintServerKey(event)

  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ status: 400, statusText: 'Job ID is required' })
  }

  const db = useDB()
  const now = new Date()

  const result = await db
    .update(salesPrintqueues)
    .set({ status: STATUS_COMPLETED, completedAt: now, updatedAt: now })
    .where(eq(salesPrintqueues.id, jobId))
    .returning({ id: salesPrintqueues.id })

  if (result.length === 0) {
    throw createError({ status: 404, statusText: 'Print job not found' })
  }

  return { success: true, id: jobId }
})
