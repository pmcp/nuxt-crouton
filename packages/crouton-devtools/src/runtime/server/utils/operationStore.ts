/**
 * Operation Store - In-memory tracking of CRUD operations
 *
 * Tracks all API calls to Crouton collection endpoints during development.
 * Implements a circular buffer to prevent memory issues.
 */

export interface Operation {
  id: string
  timestamp: number
  collection: string
  operation: 'list' | 'get' | 'create' | 'update' | 'delete'
  method: string
  path: string
  status: number
  duration: number
  teamContext?: string
  error?: string
  metadata?: Record<string, any>
  /** Item ID for get/update/delete operations (used for event correlation) */
  itemId?: string
  /** Package/app group that owns this route (e.g. 'collection', 'bookings', 'ai') */
  routeGroup?: string
}

export interface OperationFilters {
  collection?: string
  operation?: string
  status?: 'success' | 'error'
  since?: number
}

const MAX_SIZE = 500 // Circular buffer size
let operations: Operation[] = []

function add(operation: Operation): void {
  operations.unshift(operation)
  if (operations.length > MAX_SIZE) {
    operations = operations.slice(0, MAX_SIZE)
  }
}

function getAll(filters?: OperationFilters): Operation[] {
  let filtered = operations

  if (filters?.collection) {
    filtered = filtered.filter(op => op.collection === filters.collection)
  }

  if (filters?.operation) {
    filtered = filtered.filter(op => op.operation === filters.operation)
  }

  if (filters?.status) {
    const isError = filters.status === 'error'
    filtered = filtered.filter((op) => {
      return isError ? op.status >= 400 : op.status < 400
    })
  }

  if (filters?.since) {
    filtered = filtered.filter(op => op.timestamp >= filters.since!)
  }

  return filtered
}

function clear(): void {
  operations = []
}

function getStats() {
  // Group by collection
  const byCollection = operations.reduce((acc, op) => {
    acc[op.collection] = (acc[op.collection] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Group by operation type
  const byOperation = operations.reduce((acc, op) => {
    acc[op.operation] = (acc[op.operation] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate success rate
  const successful = operations.filter(op => op.status < 400).length
  const successRate = operations.length > 0
    ? Math.round((successful / operations.length) * 100)
    : 0

  // Calculate average duration
  const totalDuration = operations.reduce((sum, op) => sum + op.duration, 0)
  const avgDuration = operations.length > 0
    ? Math.round(totalDuration / operations.length)
    : 0

  return {
    total: operations.length,
    byCollection,
    byOperation,
    successRate,
    avgDuration,
    successful,
    failed: operations.length - successful
  }
}

export const operationStore = { add, getAll, clear, getStats }
