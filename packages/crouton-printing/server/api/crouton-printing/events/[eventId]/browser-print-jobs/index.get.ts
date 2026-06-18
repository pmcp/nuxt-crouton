/**
 * Browser-print (AirPrint) drainer read model — #127 / epic #61 (#328).
 *
 * The `browser-print` driver fulfils a station via the OS / AirPrint dialog
 * instead of a LAN thermal printer. Its drainer is a browser screen (the
 * printBridgeBlock): it polls this endpoint for pending tickets, each already
 * rendered to a standalone HTML document (`renderTicketHtml`), drops it in an
 * iframe and calls `window.print()`, then POSTs `/done`.
 *
 * Returns pending (status 0) generic print_jobs whose driver is `browser-print`,
 * scoped to the event. `?stationId=` narrows to one station. The stored payload
 * is the canonical ReceiptData JSON (see encodeTicket); we re-render it here so
 * the client stays dumb.
 *
 * Auth: none — an unattended venue screen on the trusted LAN (mirrors the KDS
 * display-jobs precedent; tightening to a helper token is a follow-up).
 */
import { and, asc, eq } from 'drizzle-orm'
import { renderTicketHtml, type ReceiptData } from '../../../../../utils/receipt-formatter'
import { printJobs, printers } from '../../../../../database/schema'
import { PRINT_STATUS } from '../../../../../utils/print-job-queue'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({ status: 400, statusText: 'eventId is required' })
  }

  const stationId = getQuery(event).stationId as string | undefined

  const db = useDB()

  const rows = await db
    .select({
      id: printJobs.id,
      refId: printJobs.refId,
      stationId: printJobs.printerId,
      printMode: printJobs.printMode,
      locationId: printJobs.locationId,
      printData: printJobs.payload,
      stationTitle: printers.title
    })
    .from(printJobs)
    .innerJoin(printers, eq(printJobs.printerId, printers.id))
    .where(and(
      eq(printJobs.eventId, eventId),
      eq(printJobs.status, PRINT_STATUS.PENDING),
      eq(printJobs.driver, 'browser-print'),
      ...(stationId ? [eq(printJobs.printerId, stationId)] : [])
    ))
    .orderBy(asc(printJobs.createdAt))

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
      refId: r.refId,
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
