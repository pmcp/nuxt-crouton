/**
 * Settle a client's tab: print one end-of-tab receipt aggregating every
 * non-cancelled order the client placed at this event, then deactivate the
 * client (they disappear from the POS picker and the clients panel).
 *
 * The print job is queued to the event's receipt printer (fallback: the
 * first printer) with orderId = null — it belongs to the whole tab, not to
 * one order, so the order auto-complete callbacks skip it.
 */
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { formatReceipt, DEFAULT_RECEIPT_SETTINGS, type ReceiptItem, type ReceiptSettings } from '../../../../../../../../utils/receipt-formatter'
import { PRINT_STATUS, receiptCurrencySymbol } from '../../../../../../../../utils/print-queue-service'
import { aggregateClientTab } from '../../../../../../../../utils/client-tab'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'
import { salesClients } from '~~/layers/sales/collections/clients/server/database/schema'
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

  // Aggregate identical lines across orders (shared with the tab preview
  // GET, so the panel shows exactly what this receipt prints).
  const tab = await aggregateClientTab(db, eventId, clientId)

  if (tab.orderIds.length === 0) {
    throw createError({ status: 400, statusText: 'Client has no orders at this event' })
  }

  const receiptItems: ReceiptItem[] = tab.lines.map(line => ({
    name: line.name,
    quantity: line.quantity,
    price: line.price,
    options: line.optionLabels.length > 0
      ? Object.fromEntries(line.optionLabels.map(label => [label, label]))
      : undefined
  }))
  const total = tab.total

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
    items: receiptItems,
    total,
    printMode: 'receipt',
    showPrices: true,
    createdAt: new Date(),
    receiptSettings,
    currencySymbol: receiptCurrencySymbol(salesEvent.currency || undefined),
    clientTab: { orderCount: tab.orderIds.length }
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
    orderCount: tab.orderIds.length,
    total
  }
})
