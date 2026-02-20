/**
 * @crouton-package crouton-sales
 * @description Type definitions for the sales package
 */

export type { ProductOption, SalesProduct, CartItem, UsePosOrderOptions } from '../composables/usePosOrder'

// Re-export ProductOption for direct import in components
export { type ProductOption } from '../composables/usePosOrder'

// Order status enum
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

// Print job status enum
export type PrintStatus = 0 | 1 | 2 | 9 // 0=pending, 1=printing, 2=done, 9=error

// Category type
export interface SalesCategory {
  id: string
  eventId: string
  title: string
  displayOrder?: number
}

// Order type
export interface SalesOrder {
  id: string
  eventId: string
  clientId?: string
  clientName?: string
  eventOrderNumber?: number
  overallRemarks?: string
  isPersonnel?: boolean
  status: OrderStatus
  createdAt?: string
  updatedAt?: string
}

// Client type
export interface SalesClient {
  id: string
  title: string
  isReusable?: boolean
}

// Printer type (opt-in)
export interface SalesPrinter {
  id: string
  eventId: string
  locationId: string
  title: string
  ipAddress: string
  port?: number
  status?: PrintStatus
  showPrices?: boolean
  isActive?: boolean
}

// Print queue item type (opt-in)
export interface SalesPrintQueueItem {
  id: string
  eventId: string
  orderId: string
  printerId: string
  locationId?: string
  status: PrintStatus
  printData: string
  printMode?: string
  errorMessage?: string
  retryCount?: number
  completedAt?: string
}
