/**
 * Polling endpoint for the RUT956 print spooler.
 *
 * Returns pending print jobs (status=0) for an event, joined with the printer
 * to expose its IP. Pass `?mark_as_printing=true` to atomically flip status→1
 * in the same call so concurrent pollers don't duplicate work.
 *
 * Generic print_jobs/printers (epic #325) — driver lives on the job row, so the
 * thermal spooler only ever sees `network-escpos` jobs.
 */
import { eq, and, inArray } from 'drizzle-orm'
import { requirePrintServerKey } from '../../../../utils/print-server-auth'
import { printJobs } from '../../../../database/schema'
import { PRINT_STATUS } from '../../../../utils/print-job-queue'

export default defineEventHandler(async (event) => {
  requirePrintServerKey(event)

  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const query = getQuery(event)
  const markAsPrinting = String(query.mark_as_printing) === 'true'

  const db = useDB()

  // Self-contained job: printer ip/port/title live on the row (no printers join).
  const rows = await db
    .select({
      id: printJobs.id,
      printData: printJobs.payload,
      printMode: printJobs.printMode,
      locationId: printJobs.locationId,
      printerId: printJobs.printerId,
      retryCount: printJobs.retryCount,
      printerIp: printJobs.printerIp,
      printerPort: printJobs.printerPort,
      printerTitle: printJobs.printerTitle
    })
    .from(printJobs)
    .where(
      and(
        eq(printJobs.eventId, eventId),
        eq(printJobs.status, PRINT_STATUS.PENDING),
        // Thermal spooler only — never hand it browser-print (or other-driver)
        // jobs, which carry no printer IP and aren't ESC/POS.
        eq(printJobs.driver, 'network-escpos')
      )
    )

  if (rows.length > 0 && markAsPrinting) {
    await db
      .update(printJobs)
      .set({ status: PRINT_STATUS.PRINTING, updatedAt: new Date() })
      .where(inArray(printJobs.id, rows.map((r: { id: string }) => r.id)))
  }

  return rows
})
