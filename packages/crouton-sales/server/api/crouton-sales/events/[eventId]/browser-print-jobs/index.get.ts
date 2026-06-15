/**
 * Browser-print (AirPrint) drainer read model — #127 / epic #61.
 *
 * The `browser-print` output driver fulfils a station via the OS / AirPrint
 * print dialog instead of a LAN thermal printer. Its drainer is a browser
 * screen (the printBridgeBlock): it polls this endpoint for pending tickets,
 * each already rendered to a standalone HTML document (`renderTicketHtml`),
 * drops it in an iframe and calls `window.print()`, then POSTs `/done`.
 *
 * Returns pending (status 0) queue rows whose station is a `browser-print`
 * printer, scoped to the event. `?stationId=` narrows to one station (a bridge
 * device bound to a single AirPrint printer). The stored `printData` is the
 * canonical ReceiptData JSON (see `encodeTicket`); we re-render it here so the
 * client stays dumb.
 *
 * Auth: none — an unattended venue screen on the trusted LAN (mirrors the KDS
 * `display-jobs` precedent; tightening to a helper token is a follow-up).
 *
 * Reads the consuming app's generated `sales` layer schemas.
 */
import { and, asc, eq } from 'drizzle-orm'
import { renderTicketHtml, type ReceiptData } from '../../../../../utils/receipt-formatter'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesPrinters } from '~~/layers/sales/collections/printers/server/database/schema'

const STATUS_PENDING = '0'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({ status: 400, statusText: 'eventId is required' })
  }

  const stationId = getQuery(event).stationId as string | undefined

  const db = useDB()

  const rows = await db
    .select({
      id: salesPrintqueues.id,
      orderId: salesPrintqueues.orderId,
      stationId: salesPrintqueues.printerId,
      printMode: salesPrintqueues.printMode,
      locationId: salesPrintqueues.locationId,
      printData: salesPrintqueues.printData,
      stationTitle: salesPrinters.title
    })
    .from(salesPrintqueues)
    .innerJoin(salesPrinters, eq(salesPrintqueues.printerId, salesPrinters.id))
    .where(and(
      eq(salesPrintqueues.eventId, eventId),
      eq(salesPrintqueues.status, STATUS_PENDING),
      eq(salesPrinters.driver, 'browser-print'),
      ...(stationId ? [eq(salesPrintqueues.printerId, stationId)] : [])
    ))
    .orderBy(asc(salesPrintqueues.createdAt))

  // useDB() is loosely typed → rows are `any`; annotate like the rest of the package.
  const jobs = rows.map((r: any) => {
    let data: ReceiptData | null = null
    try {
      data = JSON.parse(r.printData) as ReceiptData
    }
    catch {
      data = null
    }
    return {
      id: r.id,
      orderId: r.orderId,
      stationId: r.stationId,
      stationTitle: r.stationTitle,
      printMode: r.printMode,
      locationId: r.locationId,
      orderNumber: data?.orderNumber != null ? String(data.orderNumber) : '—',
      // A row whose payload won't parse can't be rendered — surface it as a
      // failable ticket (html null) rather than crashing the whole poll.
      html: data ? renderTicketHtml(data) : null
    }
  })

  return { jobs }
})
