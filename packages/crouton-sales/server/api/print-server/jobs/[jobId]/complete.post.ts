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

  // completedAt is a text column (cli regression: schema says datetime but
  // gets generated as text). Pass an ISO string so drizzle/SQLite store it
  // cleanly instead of the long Date.toString() format which trips D1.
  // updatedAt is a real integer({mode:'timestamp'}) column, so a Date is fine.
  const result = await db
    .update(salesPrintqueues)
    .set({ status: STATUS_COMPLETED, completedAt: now.toISOString(), updatedAt: now })
    .where(eq(salesPrintqueues.id, jobId))
    .returning({ id: salesPrintqueues.id })

  if (result.length === 0) {
    throw createError({ status: 404, statusText: 'Print job not found' })
  }

  return { success: true, id: jobId }
})
