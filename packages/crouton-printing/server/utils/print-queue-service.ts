/**
 * @crouton-package crouton-printing
 * @description Print queue service utilities for thermal receipt printing
 * @opt-in Requires print module to be enabled
 *
 * Note: This provides types and formatters. Database operations use the
 * consuming app's generated layer tables (e.g. salesPrintqueues, salesPrinters).
 */

import { type ReceiptData, type ReceiptItem, type ReceiptSettings } from './receipt-formatter'
import { DEFAULT_DRIVER, getDriver, isDriverRegistered, registeredDriverIds } from './driver-registry'

/**
 * Encode one ticket for a station's output driver via the driver registry.
 * `network-escpos` (default) emits base64 ESC/POS bytes for the thermal TCP path
 * (unchanged); `browser-print` stores the canonical ReceiptData as JSON, which
 * the browser-print drainer renders to HTML (renderTicketHtml, in the
 * browser-print-jobs endpoint) and sends to the OS / AirPrint dialog. The stored
 * payload differs by driver; routing + ReceiptData do not.
 *
 * Null/undefined driver maps to the default (`network-escpos`). An unregistered
 * driver falls back to the default encoder (forward-compatible — matches the
 * pre-registry behaviour where any non-`browser-print` value hit the ESC/POS
 * path).
 */
export function encodeTicket(data: ReceiptData, driver?: string): string {
  const resolved = getDriver(driver) ?? getDriver(DEFAULT_DRIVER)!
  return resolved.encode(data)
}

// Status codes (PRINT_STATUS / PrintStatusCode) live in ./print-job-queue.ts —
// the single source of truth, text values matching the print_jobs.status column
// and the on-site spooler contract. Don't redeclare them here (auto-import would
// see a duplicate symbol).

export interface OrderItemForPrint {
  productId: string
  productTitle: string
  quantity: number
  unitPrice: number
  remarks?: string
  locationId?: string
  locationTitle?: string
  selectedOptions?: Record<string, unknown>
}

export interface PrintQueueGeneratorOptions {
  orderId: string
  eventId: string
  teamId: string
  orderNumber: string
  clientName?: string
  helperName?: string
  orderNotes?: string
  teamName: string
  eventName: string
  isPersonnel?: boolean
  createdBy: string
  /** Event currency ('EUR' | 'USD', default EUR) — sets the receipt price symbol. */
  currency?: string
  /**
   * Also queue the combined customer receipt on the event's receipt printer.
   * Receipts are on-demand only: checkout never sets this — only the manual
   * reprint endpoint does. Tab clients get theirs via end-receipt instead.
   */
  withReceipt?: boolean
}

/** Map an event currency code to the symbol printed on receipts. */
export function receiptCurrencySymbol(currency?: string): string {
  return currency === 'USD' ? '$' : '€'
}

export interface PrinterConfig {
  id: string
  eventId: string
  locationId?: string
  title: string
  ipAddress: string
  port?: number
  showPrices?: boolean
  isActive?: boolean
  type?: 'kitchen' | 'receipt'
  /** Output driver. Null/undefined = 'network-escpos' (the thermal TCP path). */
  driver?: string
}

export interface PrintJobData {
  printerId: string
  locationId?: string
  printData: string
  printMode: 'kitchen' | 'receipt'
}

/**
 * Group order items by their location for kitchen ticket printing
 */
export function groupItemsByLocation(items: OrderItemForPrint[]): Map<string, {
  items: OrderItemForPrint[]
  locationTitle: string
}> {
  const itemsByLocation = new Map<string, {
    items: OrderItemForPrint[]
    locationTitle: string
  }>()

  for (const item of items) {
    const locationId = item.locationId || 'default'

    if (!itemsByLocation.has(locationId)) {
      itemsByLocation.set(locationId, {
        items: [],
        locationTitle: item.locationTitle || 'Default'
      })
    }

    itemsByLocation.get(locationId)!.items.push(item)
  }

  return itemsByLocation
}

/**
 * Generate print job data for kitchen tickets (one per location per printer)
 */
export function generateKitchenTicketData(
  options: PrintQueueGeneratorOptions,
  locationId: string,
  locationTitle: string,
  items: OrderItemForPrint[],
  printer: PrinterConfig,
  receiptSettings?: ReceiptSettings,
  locationNote?: string
): PrintJobData {
  const receiptItems: ReceiptItem[] = items.map(item => ({
    name: item.productTitle,
    quantity: item.quantity,
    price: printer.showPrices ? item.unitPrice : undefined,
    notes: item.remarks,
    options: item.selectedOptions
  }))

  const total = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

  const receiptData: ReceiptData = {
    orderNumber: options.orderNumber,
    orderId: options.orderId,
    teamName: options.teamName,
    eventName: options.eventName,
    clientName: options.clientName,
    helperName: options.helperName,
    orderNotes: options.orderNotes,
    items: receiptItems,
    total: printer.showPrices ? total : undefined,
    locationName: locationTitle,
    locationNote,
    printMode: 'kitchen',
    showPrices: printer.showPrices || false,
    createdAt: new Date(),
    isPersonnel: options.isPersonnel,
    receiptSettings,
    currencySymbol: receiptCurrencySymbol(options.currency)
  }

  return {
    printerId: printer.id,
    locationId: locationId === 'default' ? undefined : locationId,
    printData: encodeTicket(receiptData, printer.driver),
    printMode: 'kitchen'
  }
}

/**
 * Generate print job data for customer receipt (all items combined)
 */
export function generateReceiptData(
  options: PrintQueueGeneratorOptions,
  items: OrderItemForPrint[],
  printer: PrinterConfig,
  receiptSettings?: ReceiptSettings
): PrintJobData {
  const receiptItems: ReceiptItem[] = items.map(item => ({
    name: item.productTitle,
    quantity: item.quantity,
    price: item.unitPrice,
    notes: item.remarks,
    options: item.selectedOptions
  }))

  const total = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

  const receiptData: ReceiptData = {
    orderNumber: options.orderNumber,
    orderId: options.orderId,
    teamName: options.teamName,
    eventName: options.eventName,
    clientName: options.clientName,
    helperName: options.helperName,
    orderNotes: options.orderNotes,
    items: receiptItems,
    total,
    locationName: undefined,
    printMode: 'receipt',
    showPrices: true,
    createdAt: new Date(),
    isPersonnel: options.isPersonnel,
    receiptSettings,
    currencySymbol: receiptCurrencySymbol(options.currency)
  }

  return {
    printerId: printer.id,
    locationId: undefined,
    printData: encodeTicket(receiptData, printer.driver),
    printMode: 'receipt'
  }
}

/**
 * Generate all print jobs for an order
 *
 * This function renders the print data but does NOT insert into the database.
 * Hand each rendered job to the generic queue via `enqueuePrintJob` (the domain
 * supplies `source` + an opaque `refType`/`refId` back-reference).
 *
 * @example
 * ```ts
 * const jobs = generatePrintJobsForOrder(options, orderItems, printers)
 *
 * for (const job of jobs) {
 *   await enqueuePrintJob(db, {
 *     source: 'sales',
 *     printerId: job.printerId,
 *     locationId: job.locationId,
 *     payload: job.printData,
 *     printMode: job.printMode,
 *     driver: job.driver,
 *     refType: 'order',
 *     refId: options.orderId,
 *     teamId: options.teamId,
 *     eventId: options.eventId
 *   })
 * }
 * ```
 */
export function generatePrintJobsForOrder(
  options: PrintQueueGeneratorOptions,
  orderItems: OrderItemForPrint[],
  printers: PrinterConfig[],
  receiptSettings?: ReceiptSettings,
  locationRemarks?: Record<string, string>
): PrintJobData[] {
  const jobs: PrintJobData[] = []

  if (orderItems.length === 0 || printers.length === 0) {
    return jobs
  }

  // Group items by location
  const itemsByLocation = groupItemsByLocation(orderItems)

  // Driver decides how a station is fulfilled. Null/undefined = the default
  // driver ('network-escpos', the thermal path), so existing stations behave
  // exactly as before. Routing (kitchen-by-location vs combined receipt) is
  // driver-agnostic — only the encoding differs (encodeTicket), so thermal +
  // browser-print stations route identically. Stations on an unregistered
  // driver produce no jobs (forward-compatible).
  const driverOf = (p: PrinterConfig) => p.driver || DEFAULT_DRIVER
  const drivable = printers.filter(p => isDriverRegistered(driverOf(p)))

  // Separate kitchen printers (by location) and receipt printers.
  const kitchenPrinters = drivable.filter(p => p.type === 'kitchen' || !p.type)
  const receiptPrinters = drivable.filter(p => p.type === 'receipt')

  // Create kitchen ticket jobs (one per location per printer)
  for (const [locationId, locationData] of itemsByLocation) {
    const { items, locationTitle } = locationData

    // Find printers for this location
    const printersForLocation = kitchenPrinters.filter(p =>
      p.locationId === locationId || locationId === 'default'
    )

    // Per-location remark (items-required: only locations with items reach
    // this loop, so a remark prints alongside that location's existing ticket).
    // 'default' is the synthetic key for items with no location — never keyed.
    const locationNote = locationId === 'default'
      ? undefined
      : locationRemarks?.[locationId]

    for (const printer of printersForLocation) {
      jobs.push(generateKitchenTicketData(
        options,
        locationId,
        locationTitle,
        items,
        printer,
        receiptSettings,
        locationNote
      ))
    }
  }

  // Create receipt job (all items combined) — on-demand only (withReceipt)
  // Use the first receipt printer (could be enhanced to support multiple)
  const receiptPrinter = options.withReceipt ? receiptPrinters[0] : undefined
  if (receiptPrinter) {
    const allItems: OrderItemForPrint[] = []
    for (const [, locationData] of itemsByLocation) {
      allItems.push(...locationData.items)
    }

    jobs.push(generateReceiptData(options, allItems, receiptPrinter, receiptSettings))
  }

  return jobs
}

// Re-export the registry surface so consumers can register/inspect drivers
// without a second import.
export { DEFAULT_DRIVER, getDriver, isDriverRegistered, registerDriver, registeredDriverIds, type OutputDriver } from './driver-registry'

// Note: formatReceipt, formatTestReceipt, DEFAULT_RECEIPT_SETTINGS and types
// are exported from ./receipt-formatter.ts - import from there directly
