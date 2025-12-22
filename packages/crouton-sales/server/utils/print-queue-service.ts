/**
 * @crouton-package crouton-sales
 * @description Print queue service utilities for thermal receipt printing
 * @opt-in Requires print module to be enabled
 *
 * Note: This provides types and formatters. Database operations use the
 * generated sales layer tables (salesPrintqueues, salesPrinters, etc.)
 */

import { formatReceipt, type ReceiptItem, type FormattedReceipt } from './receipt-formatter'

// Status codes for print queue
export const PRINT_STATUS = {
  PENDING: 0,
  PRINTING: 1,
  COMPLETED: 2,
  FAILED: 9
} as const

export type PrintStatusCode = typeof PRINT_STATUS[keyof typeof PRINT_STATUS]

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
  orderNotes?: string
  teamName: string
  eventName: string
  isPersonnel?: boolean
  createdBy: string
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
  printer: PrinterConfig
): PrintJobData {
  const receiptItems: ReceiptItem[] = items.map(item => ({
    name: item.productTitle,
    quantity: item.quantity,
    price: printer.showPrices ? item.unitPrice : undefined,
    notes: item.remarks,
    options: item.selectedOptions
  }))

  const total = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

  const formattedReceipt = formatReceipt({
    orderNumber: options.orderNumber,
    orderId: options.orderId,
    teamName: options.teamName,
    eventName: options.eventName,
    clientName: options.clientName,
    orderNotes: options.orderNotes,
    items: receiptItems,
    total: printer.showPrices ? total : undefined,
    locationName: locationTitle,
    printMode: 'kitchen',
    showPrices: printer.showPrices || false,
    createdAt: new Date(),
    isPersonnel: options.isPersonnel
  })

  return {
    printerId: printer.id,
    locationId: locationId === 'default' ? undefined : locationId,
    printData: formattedReceipt.base64,
    printMode: 'kitchen'
  }
}

/**
 * Generate print job data for customer receipt (all items combined)
 */
export function generateReceiptData(
  options: PrintQueueGeneratorOptions,
  items: OrderItemForPrint[],
  printer: PrinterConfig
): PrintJobData {
  const receiptItems: ReceiptItem[] = items.map(item => ({
    name: item.productTitle,
    quantity: item.quantity,
    price: item.unitPrice,
    notes: item.remarks,
    options: item.selectedOptions
  }))

  const total = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

  const formattedReceipt = formatReceipt({
    orderNumber: options.orderNumber,
    orderId: options.orderId,
    teamName: options.teamName,
    eventName: options.eventName,
    clientName: options.clientName,
    orderNotes: options.orderNotes,
    items: receiptItems,
    total,
    locationName: undefined,
    printMode: 'receipt',
    showPrices: true,
    createdAt: new Date(),
    isPersonnel: options.isPersonnel
  })

  return {
    printerId: printer.id,
    locationId: undefined,
    printData: formattedReceipt.base64,
    printMode: 'receipt'
  }
}

/**
 * Generate all print jobs for an order
 *
 * This function creates the print data but does NOT insert into the database.
 * Use the returned data to create records in your generated salesPrintqueues table.
 *
 * @example
 * ```ts
 * const jobs = generatePrintJobsForOrder(options, orderItems, printers)
 *
 * for (const job of jobs) {
 *   await db.insert(salesPrintqueues).values({
 *     teamId,
 *     eventId,
 *     orderId,
 *     printerId: job.printerId,
 *     locationId: job.locationId,
 *     printData: job.printData,
 *     printMode: job.printMode,
 *     status: PRINT_STATUS.PENDING,
 *     retryCount: 0
 *   })
 * }
 * ```
 */
export function generatePrintJobsForOrder(
  options: PrintQueueGeneratorOptions,
  orderItems: OrderItemForPrint[],
  printers: PrinterConfig[]
): PrintJobData[] {
  const jobs: PrintJobData[] = []

  if (orderItems.length === 0 || printers.length === 0) {
    return jobs
  }

  // Group items by location
  const itemsByLocation = groupItemsByLocation(orderItems)

  // Separate kitchen printers (by location) and receipt printers
  const kitchenPrinters = printers.filter(p => p.type === 'kitchen' || !p.type)
  const receiptPrinters = printers.filter(p => p.type === 'receipt')

  // Create kitchen ticket jobs (one per location per printer)
  for (const [locationId, locationData] of itemsByLocation) {
    const { items, locationTitle } = locationData

    // Find printers for this location
    const printersForLocation = kitchenPrinters.filter(p =>
      p.locationId === locationId || locationId === 'default'
    )

    for (const printer of printersForLocation) {
      jobs.push(generateKitchenTicketData(
        options,
        locationId,
        locationTitle,
        items,
        printer
      ))
    }
  }

  // Create receipt job (all items combined)
  if (receiptPrinters.length > 0) {
    const allItems: OrderItemForPrint[] = []
    for (const [, locationData] of itemsByLocation) {
      allItems.push(...locationData.items)
    }

    // Use the first receipt printer (could be enhanced to support multiple)
    const receiptPrinter = receiptPrinters[0]
    jobs.push(generateReceiptData(options, allItems, receiptPrinter))
  }

  return jobs
}

// Re-export receipt formatter types and functions
export {
  formatReceipt,
  formatTestReceipt,
  DEFAULT_RECEIPT_SETTINGS,
  type ReceiptItem,
  type ReceiptData,
  type ReceiptSettings,
  type FormattedReceipt
} from './receipt-formatter'
