/**
 * @crouton-package crouton-sales
 * Higher-level helper that generates print jobs for an order and inserts
 * one `salesPrintqueues` row per job. Used by both the order-create endpoint
 * and the manual re-print endpoint.
 *
 * Imports drizzle schema lazily from the consuming app's generated sales layer.
 */
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import {
  generatePrintJobsForOrder,
  PRINT_STATUS,
  type OrderItemForPrint,
  type PrinterConfig
} from './print-queue-service'

interface GenerateInsertOptions {
  db: any
  orderId: string
  eventId: string
  teamId: string
  helperDisplayName: string
  helperId: string
  orderNumber: string
  clientName?: string
  orderNotes?: string
  teamName: string
  eventName: string
  isPersonnel?: boolean
}

export async function generateAndInsertPrintQueues(opts: GenerateInsertOptions): Promise<string[]> {
  const { db, orderId, eventId, teamId, helperDisplayName, helperId } = opts

  const { salesOrderitems } = await import('~~/layers/sales/collections/orderitems/server/database/schema')
  const { salesProducts } = await import('~~/layers/sales/collections/products/server/database/schema')
  const { salesLocations } = await import('~~/layers/sales/collections/locations/server/database/schema')
  const { salesPrinters } = await import('~~/layers/sales/collections/printers/server/database/schema')
  const { salesPrintqueues } = await import('~~/layers/sales/collections/printqueues/server/database/schema')

  const printers = await db.select().from(salesPrinters).where(eq(salesPrinters.eventId, eventId))
  if (printers.length === 0) return []

  const items = await db.select().from(salesOrderitems).where(eq(salesOrderitems.orderId, orderId))
  if (items.length === 0) return []

  const products = await db.select().from(salesProducts).where(eq(salesProducts.eventId, eventId))
  const productById = new Map(products.map((p: any) => [p.id, p]))

  const locations = await db.select().from(salesLocations).where(eq(salesLocations.eventId, eventId))
  const locationTitleById = new Map(locations.map((l: any) => [l.id, l.title]))

  const printItems: OrderItemForPrint[] = items.map((it: any) => {
    const product: any = productById.get(it.productId)

    // Resolve selected option IDs to readable labels
    let resolvedOptions: Record<string, string> | undefined
    const rawOptions = it.selectedOptions
    if (rawOptions && product?.options && Array.isArray(product.options) && product.options.length > 0) {
      const optionIds = Array.isArray(rawOptions)
        ? rawOptions
        : typeof rawOptions === 'string'
          ? [rawOptions]
          : []
      const labels = optionIds
        .map((id: string) => product.options.find((o: any) => o.id === id)?.label)
        .filter((label: string | undefined): label is string => Boolean(label))
      if (labels.length > 0) {
        resolvedOptions = Object.fromEntries(labels.map((label: string) => [label, label]))
      }
    }

    return {
      productId: it.productId,
      productTitle: product?.title || 'Item',
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      remarks: it.remarks ?? undefined,
      locationId: product?.locationId ?? undefined,
      locationTitle: product?.locationId ? locationTitleById.get(product.locationId) : undefined,
      selectedOptions: resolvedOptions
    }
  })

  const printerConfigs: PrinterConfig[] = printers.map((p: any) => ({
    id: p.id,
    eventId: p.eventId,
    title: p.title,
    ipAddress: p.ipAddress,
    port: p.port ?? undefined,
    locationId: p.locationId ?? undefined,
    showPrices: p.showPrices ?? true,
    type: 'kitchen'
  }))

  const jobs = generatePrintJobsForOrder(
    {
      orderId,
      eventId,
      teamId,
      orderNumber: opts.orderNumber,
      clientName: opts.clientName,
      orderNotes: opts.orderNotes,
      teamName: opts.teamName,
      eventName: opts.eventName,
      isPersonnel: opts.isPersonnel || false,
      createdBy: helperId
    },
    printItems,
    printerConfigs
  )

  const queueIds: string[] = []
  for (const job of jobs) {
    const queueId = nanoid()
    await db.insert(salesPrintqueues).values({
      id: queueId,
      teamId,
      owner: helperDisplayName,
      eventId,
      orderId,
      printerId: job.printerId,
      locationId: job.locationId,
      // CLI-generated schema declares status/retryCount as TEXT despite the
      // JSON schema saying integer. Cast to string so equality with string
      // literals (e.g. '0' for STATUS_PENDING in the jobs endpoint) works.
      status: String(PRINT_STATUS.PENDING),
      printData: job.printData,
      printMode: job.printMode || 'normal',
      retryCount: '0',
      createdBy: helperId,
      updatedBy: helperId
    })
    queueIds.push(queueId)
  }

  return queueIds
}
