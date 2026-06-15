/**
 * Browser-print drainer callback: a ticket reached the OS / AirPrint dialog.
 * Marks the job completed and auto-completes the order (shared with the thermal
 * path's lifecycle via `completePrintJob`). Scoped to the event + a
 * `browser-print` station so it can only ever close a browser-print job.
 *
 * Auth: none (unattended venue screen, like the KDS bump) — see the GET.
 */
import { and, eq } from 'drizzle-orm'
import { completePrintJob } from '../../../../../../utils/print-job-complete'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesPrinters } from '~~/layers/sales/collections/printers/server/database/schema'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  const jobId = getRouterParam(event, 'jobId')
  if (!eventId || !jobId) {
    throw createError({ status: 400, statusText: 'eventId and jobId are required' })
  }

  const db = useDB()

  // Guard: the job must belong to this event AND a browser-print station.
  const [row] = await db
    .select({ id: salesPrintqueues.id })
    .from(salesPrintqueues)
    .innerJoin(salesPrinters, eq(salesPrintqueues.printerId, salesPrinters.id))
    .where(and(
      eq(salesPrintqueues.id, jobId),
      eq(salesPrintqueues.eventId, eventId),
      eq(salesPrinters.driver, 'browser-print')
    ))

  if (!row) {
    throw createError({ status: 404, statusText: 'Browser-print job not found' })
  }

  const { orderCompleted } = await completePrintJob(db, jobId)
  return { success: true, id: jobId, orderCompleted }
})
