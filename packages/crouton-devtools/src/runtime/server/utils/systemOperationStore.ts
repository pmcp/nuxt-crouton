/**
 * System Operation Store - In-memory tracking of crouton:operation events
 *
 * Stores non-CRUD system events (auth, email, AI, webhooks, etc.) emitted
 * via the crouton:operation Nitro hook. Circular buffer, dev-only.
 */

export interface SystemOperation {
  id: string
  timestamp: number
  type: string
  source: string
  teamId?: string
  userId?: string
  correlationId?: string
  metadata?: Record<string, any>
}

class SystemOperationStore {
  private operations: SystemOperation[] = []
  private readonly maxSize = 500

  add(operation: SystemOperation): void {
    this.operations.unshift(operation)
    if (this.operations.length > this.maxSize) {
      this.operations = this.operations.slice(0, this.maxSize)
    }
  }

  getAll(filters?: { type?: string, source?: string, since?: number }): SystemOperation[] {
    let filtered = this.operations

    if (filters?.type) {
      filtered = filtered.filter(op => op.type === filters.type || op.type.startsWith(`${filters.type}:`))
    }

    if (filters?.source) {
      filtered = filtered.filter(op => op.source === filters.source)
    }

    if (filters?.since) {
      filtered = filtered.filter(op => op.timestamp >= filters.since!)
    }

    return filtered
  }

  clear(): void {
    this.operations = []
  }

  getStats() {
    const ops = this.operations

    const byType = ops.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySource = ops.reduce((acc, op) => {
      acc[op.source] = (acc[op.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total: ops.length, byType, bySource }
  }
}

export const systemOperationStore = new SystemOperationStore()
