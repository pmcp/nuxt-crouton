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
}

export interface OperationFilters {
  collection?: string
  operation?: string
  status?: 'success' | 'error'
  since?: number
}

class OperationStore {
  private operations: Operation[] = []
  private readonly maxSize = 500 // Circular buffer size

  /**
   * Add a new operation to the store
   */
  add(operation: Operation): void {
    this.operations.unshift(operation)

    // Maintain circular buffer
    if (this.operations.length > this.maxSize) {
      this.operations = this.operations.slice(0, this.maxSize)
    }
  }

  /**
   * Get all operations with optional filters
   */
  getAll(filters?: OperationFilters): Operation[] {
    let filtered = this.operations

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
      filtered = filtered.filter(op => op.timestamp >= filters.since)
    }

    return filtered
  }

  /**
   * Clear all operations from the store
   */
  clear(): void {
    this.operations = []
  }

  /**
   * Get operation statistics
   */
  getStats() {
    const operations = this.operations

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
}

// Singleton instance
export const operationStore = new OperationStore()
