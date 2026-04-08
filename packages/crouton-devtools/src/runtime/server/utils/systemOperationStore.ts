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

const MAX_SIZE = 500
let operations: SystemOperation[] = []

function add(operation: SystemOperation): void {
  operations.unshift(operation)
  if (operations.length > MAX_SIZE) {
    operations = operations.slice(0, MAX_SIZE)
  }
}

function getAll(filters?: { type?: string, source?: string, since?: number }): SystemOperation[] {
  let filtered = operations

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

function clear(): void {
  operations = []
}

function getStats() {
  const byType = operations.reduce((acc, op) => {
    acc[op.type] = (acc[op.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const bySource = operations.reduce((acc, op) => {
    acc[op.source] = (acc[op.source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return { total: operations.length, byType, bySource }
}

export const systemOperationStore = { add, getAll, clear, getStats }
