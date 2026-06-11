/**
 * Settle a client's tab: print one end-of-tab receipt aggregating every
 * non-cancelled order the client placed at this event, then deactivate the
 * client (they disappear from the POS picker and the clients panel).
 *
 * The print job is queued to the event's receipt printer (fallback: the
 * first printer) with orderId = null — it belongs to the whole tab, not to
 * one order, so the order auto-complete callbacks skip it.
 */
import { eq, and, ne, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { formatReceipt, DEFAULT_RECEIPT_SETTINGS, type ReceiptItem, type ReceiptSettings } from '../../../../../../../../utils/receipt-formatter'
import { PRINT_STATUS, receiptCurrencySymbol } from '../../../../../../../../utils/print-queue-service'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'
import { salesClients } from '~~/layers/sales/collections/clients/server/database/schema'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'
import { salesOrderitems } from '~~/layers/sales/collections/orderitems/server/database/schema'
import { salesProducts } from '~~/layers/sales/collections/products/server/database/schema'
import { salesPrinters } from '~~/layers/sales/collections/printers/server/database/schema'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesEventsettings } from '~~/layers/sales/collections/eventsettings/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')
  const clientId = getRouterParam(event, 'clientId')

  if (!eventId || !clientId) {
    throw createError({ status: 400, statusText: 'Event ID and Client ID are required' })
  }

  const db = useDB()

  const [salesEvent] = await db
    .select()
    .from(salesEvents)
    .where(and(eq(salesEvents.id, eventId), eq(salesEvents.teamId, team.id)))
    .limit(1)

  if (!salesEvent) {
    throw createError({ status: 404, statusText: 'Event not found' })
  }

  const [client] = await db
    .select()
    .from(salesClients)
    .where(and(eq(salesClients.id, clientId), eq(salesClients.teamId, team.id)))
    .limit(1)

  if (!client) {
    throw createError({ status: 404, statusText: 'Client not found' })
  }
  if (client.isActive === false) {
    throw createError({ status: 400, statusText: 'Client is already settled' })
  }

  const orders = await db
    .select({ id: salesOrders.id })
    .from(salesOrders)
    .where(and(
      eq(salesOrders.eventId, eventId),
      eq(salesOrders.clientId, clientId),
      ne(salesOrders.status, 'cancelled')
    ))

  if (orders.length === 0) {
    throw createError({ status: 400, statusText: 'Client has no orders at this event' })
  }

  const orderIds = orders.map((o: { id: string }) => o.id)
  const items = await db
    .select()
    .from(salesOrderitems)
    .where(inArray(salesOrderitems.orderId, orderIds))

  const products = await db.select().from(salesProducts).where(eq(salesProducts.eventId, eventId))
  const productById = new Map(products.map((p: any) => [p.id, p]))

  // Aggregate identical lines across orders: same product, same unit price,
  // same selected options become one line with the summed quantity.
  const aggregated = new Map<string, ReceiptItem & { _total: number }>()
  for (const it of items as any[]) {
    const product: any = productById.get(it.productId)

    // Resolve selected option IDs to readable labels (same convention as
    // generate-print-queues: the POS stores option ids on the order item).
    let optionLabels: string[] = []
    const rawOptions = it.selectedOptions
    if (rawOptions && Array.isArray(product?.options) && product.options.length > 0) {
      const optionIds = Array.isArray(rawOptions)
        ? rawOptions
        : typeof rawOptions === 'string' ? [rawOptions] : []
      optionLabels = optionIds
        .map((id: string) => product.options.find((o: any) => o.id === id)?.label)
        .filter((label: string | undefined): label is string => Boolean(label))
    }

    const unitPrice = Number(it.unitPrice)
    const key = `${it.productId}|${unitPrice}|${[...optionLabels].sort().join(',')}`
    const existing = aggregated.get(key)
    const quantity = Number(it.quantity)
    const lineTotal = Number(it.totalPrice ?? unitPrice * quantity)

    if (existing) {
      existing.quantity += quantity
      existing._total += lineTotal
    }
    else {
      aggregated.set(key, {
        name: product?.title || 'Item',
        quantity,
        price: unitPrice,
        options: optionLabels.length > 0
          ? Object.fromEntries(optionLabels.map(label => [label, label]))
          : undefined,
        _total: lineTotal
      })
    }
  }

  const receiptItems = [...aggregated.values()]
  const total = receiptItems.reduce((sum, item) => sum + item._total, 0)

  // The tab settles on the receipt printer; events with only kitchen
  // printers fall back to the first one so the flow still works.
  const printers = await db.select().from(salesPrinters).where(eq(salesPrinters.eventId, eventId))
  const printer = printers.find((p: any) => p.type === 'receipt') || printers[0]
  if (!printer) {
    throw createError({ status: 400, statusText: 'No printers configured for this event' })
  }

  // Per-event receipt text customization, same fallback as order printing
  let receiptSettings: ReceiptSettings = DEFAULT_RECEIPT_SETTINGS
  const [settingsRow] = await db
    .select()
    .from(salesEventsettings)
    .where(and(
      eq(salesEventsettings.eventId, eventId),
      eq(salesEventsettings.settingKey, 'receipt_settings')
    ))
  if (settingsRow?.settingValue) {
    try {
      receiptSettings = { ...DEFAULT_RECEIPT_SETTINGS, ...JSON.parse(settingsRow.settingValue) }
    } catch {
      receiptSettings = DEFAULT_RECEIPT_SETTINGS
    }
  }

  const formatted = formatReceipt({
    orderNumber: '',
    orderId: '',
    teamName: team.name || 'POS',
    eventName: salesEvent.title,
    clientName: client.title,
    helperName: user.name || undefined,
    items: receiptItems.map(({ _total, ...item }) => item),
    total,
    printMode: 'receipt',
    showPrices: true,
    createdAt: new Date(),
    receiptSettings,
    currencySymbol: receiptCurrencySymbol(salesEvent.currency || undefined),
    clientTab: { orderCount: orders.length }
  })

  const queueId = nanoid()
  const ownerName = user.name || user.email || 'admin'
  await db.insert(salesPrintqueues).values({
    id: queueId,
    teamId: team.id,
    owner: ownerName,
    eventId,
    orderId: null,
    printerId: printer.id,
    locationId: null,
    status: String(PRINT_STATUS.PENDING),
    printData: formatted.base64,
    printMode: 'receipt',
    retryCount: '0',
    createdBy: user.id,
    updatedBy: user.id
  })

  // Settled: hide the client from the POS picker and the clients panel.
  await db
    .update(salesClients)
    .set({ isActive: false, updatedBy: user.id })
    .where(eq(salesClients.id, clientId))

  return {
    success: true,
    queueId,
    orderCount: orders.length,
    total
  }
})
