/**
 * Polling endpoint for the RUT956 print spooler.
 *
 * Returns pending print jobs (status=0) for an event, joined with the printer
 * to expose its IP. Pass `?mark_as_printing=true` to atomically flip status→1
 * in the same call so concurrent pollers don't duplicate work.
 */
import { eq, and, or, inArray, isNull } from 'drizzle-orm'
import { requirePrintServerKey } from '../../../../utils/print-server-auth'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesPrinters } from '~~/layers/sales/collections/printers/server/database/schema'

// salesPrintqueues.status is text-typed in the generated drizzle schema
// (despite the JSON schema declaring 'integer'). Use string literals.
const STATUS_PENDING = '0'
const STATUS_PRINTING = '1'

export default defineEventHandler(async (event) => {
  requirePrintServerKey(event)

  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const query = getQuery(event)
  const markAsPrinting = String(query.mark_as_printing) === 'true'

  const db = useDB()

  const rows = await db
    .select({
      id: salesPrintqueues.id,
      printData: salesPrintqueues.printData,
      printMode: salesPrintqueues.printMode,
      locationId: salesPrintqueues.locationId,
      printerId: salesPrintqueues.printerId,
      retryCount: salesPrintqueues.retryCount,
      printerIp: salesPrinters.ipAddress,
      printerPort: salesPrinters.port,
      printerTitle: salesPrinters.title
    })
    .from(salesPrintqueues)
    .leftJoin(salesPrinters, eq(salesPrintqueues.printerId, salesPrinters.id))
    .where(
      and(
        eq(salesPrintqueues.eventId, eventId),
        eq(salesPrintqueues.status, STATUS_PENDING),
        // Thermal spooler only — never hand it browser-print (or other-driver)
        // jobs, which carry no printer IP and aren't ESC/POS. NULL ⇒ legacy
        // thermal station, so it stays included.
        or(isNull(salesPrinters.driver), eq(salesPrinters.driver, 'network-escpos'))
      )
    )

  if (rows.length > 0 && markAsPrinting) {
    await db
      .update(salesPrintqueues)
      .set({ status: STATUS_PRINTING, updatedAt: new Date() })
      .where(inArray(salesPrintqueues.id, rows.map((r: { id: string }) => r.id)))
  }

  return rows
})
