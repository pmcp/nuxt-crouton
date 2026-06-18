import { describe, it, expect, vi } from 'vitest'
import {
  onJobCreated,
  onJobCompleted,
  onJobFailed,
  type CreatedJob,
  type JobOutcome,
  type PrintingReactionDeps
} from '../server/utils/printing-reactions'

/**
 * The pure sales reactions to the generic crouton-printing lifecycle (#329).
 * These mirror the order-completion + cloud-sync-outbox behaviour that used to
 * live in the deleted print-job-complete.ts, now driven off print_jobs.
 *
 * The drizzle calls are faked just enough to drive the branches:
 *  - completed reads the count of non-completed print_jobs for the order
 *  - completed/failed update salesOrders and re-select the order row for the outbox
 */

const salesOrders = { id: 'orders.id', status: 'orders.status' } as any
const printJobs = { refType: 'jobs.refType', refId: 'jobs.refId', status: 'jobs.status' } as any

interface FakeDbOptions {
  /** Rows the `print_jobs` count query returns: [{ n }]. */
  remainingCount?: number
  /** The order row a `select().from(salesOrders).limit(1)` returns. */
  orderRow?: Record<string, unknown> | null
}

/** Records what the handler did so assertions can read it back. */
interface DbCalls {
  orderUpdates: Array<Record<string, unknown>>
}

function makeFakeDb(opts: FakeDbOptions = {}) {
  const calls: DbCalls = { orderUpdates: [] }
  const remaining = opts.remainingCount ?? 0
  const orderRow = opts.orderRow === undefined ? { id: 'order-1', teamId: 'team-1', eventId: 'event-1', status: 'completed' } : opts.orderRow

  const db = {
    // db.select({ n: count() }).from(printJobs).where(...) → [{ n }]
    // db.select().from(salesOrders).where(...).limit(1) → [orderRow]
    select(_projection?: unknown) {
      return {
        from(table: unknown) {
          const isOrders = table === salesOrders
          return {
            where(_cond: unknown) {
              const limitable = {
                limit(_n: number) {
                  return isOrders ? (orderRow ? [orderRow] : []) : [{ n: remaining }]
                }
              }
              // count() query awaits the where() directly (no .limit())
              return Object.assign(
                Promise.resolve(isOrders ? (orderRow ? [orderRow] : []) : [{ n: remaining }]),
                limitable
              )
            }
          }
        }
      }
    },
    update(_table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          calls.orderUpdates.push(values)
          return {
            where(_cond: unknown) {
              return Promise.resolve(undefined)
            }
          }
        }
      }
    }
  }

  return { db, calls }
}

function makeDeps(overrides: Partial<PrintingReactionDeps> = {}): {
  deps: PrintingReactionDeps
  recordOutboxEvents: ReturnType<typeof vi.fn>
} {
  const recordOutboxEvents = vi.fn(async () => {})
  const deps: PrintingReactionDeps = {
    recordOutboxEvents,
    isCloudSyncEnabled: () => true,
    loadOrdersSchema: async () => ({ salesOrders }),
    printJobs,
    ...overrides
  }
  return { deps, recordOutboxEvents }
}

const completedOutcome: JobOutcome = {
  id: 'job-1',
  source: 'sales',
  refType: 'order',
  refId: 'order-1',
  teamId: 'team-1',
  eventId: 'event-1',
  status: '2'
}

describe('onJobCompleted', () => {
  it('completes the order + records outbox when no jobs remain', async () => {
    const { db, calls } = makeFakeDb({ remainingCount: 0, orderRow: { id: 'order-1', teamId: 'team-1', eventId: 'event-1', status: 'completed' } })
    const { deps, recordOutboxEvents } = makeDeps()

    await onJobCompleted(db, completedOutcome, deps)

    // Order flipped to completed.
    expect(calls.orderUpdates).toHaveLength(1)
    expect(calls.orderUpdates[0]?.status).toBe('completed')

    // Outbox: a printstatus row + the completed order row.
    expect(recordOutboxEvents).toHaveBeenCalledTimes(1)
    const events = recordOutboxEvents.mock.calls[0]![1] as any[]
    expect(events.map(e => e.entityType)).toEqual(['printstatus', 'order'])
    expect(events[0].payload.status).toBe('2')
  })

  it('does NOT complete the order when jobs remain', async () => {
    const { db, calls } = makeFakeDb({ remainingCount: 2 })
    const { deps, recordOutboxEvents } = makeDeps()

    await onJobCompleted(db, completedOutcome, deps)

    expect(calls.orderUpdates).toHaveLength(0)
    // Only the printstatus mirror, no order row (order not completed).
    const events = recordOutboxEvents.mock.calls[0]![1] as any[]
    expect(events.map(e => e.entityType)).toEqual(['printstatus'])
  })

  it('skips outbox entirely when cloud sync is disabled but still completes order', async () => {
    const { db, calls } = makeFakeDb({ remainingCount: 0 })
    const { deps, recordOutboxEvents } = makeDeps({ isCloudSyncEnabled: () => false })

    await onJobCompleted(db, completedOutcome, deps)

    expect(calls.orderUpdates).toHaveLength(1)
    expect(calls.orderUpdates[0]?.status).toBe('completed')
    expect(recordOutboxEvents).not.toHaveBeenCalled()
  })
})

describe('onJobFailed', () => {
  it('flags the order print_failed + records outbox', async () => {
    const { db, calls } = makeFakeDb({ orderRow: { id: 'order-1', teamId: 'team-1', eventId: 'event-1', status: 'print_failed' } })
    const { deps, recordOutboxEvents } = makeDeps()

    const outcome: JobOutcome = { ...completedOutcome, status: '9', errorMessage: 'Paper out' }
    await onJobFailed(db, outcome, deps)

    expect(calls.orderUpdates).toHaveLength(1)
    expect(calls.orderUpdates[0]?.status).toBe('print_failed')

    const events = recordOutboxEvents.mock.calls[0]![1] as any[]
    expect(events.map(e => e.entityType)).toEqual(['printstatus', 'order'])
    expect(events[0].payload.status).toBe('9')
    expect(events[0].payload.errorMessage).toBe('Paper out')
  })
})

describe('onJobCreated', () => {
  it('records a printstatus outbox row without the bulky payload', async () => {
    const { db } = makeFakeDb()
    const { deps, recordOutboxEvents } = makeDeps()

    const job: CreatedJob = {
      id: 'job-1',
      source: 'sales',
      refType: 'order',
      refId: 'order-1',
      teamId: 'team-1',
      eventId: 'event-1',
      status: '0',
      payload: 'BASE64_TICKET_DATA',
      printerId: 'printer-1'
    }
    await onJobCreated(db, job, deps)

    expect(recordOutboxEvents).toHaveBeenCalledTimes(1)
    const events = recordOutboxEvents.mock.calls[0]![1] as any[]
    expect(events).toHaveLength(1)
    expect(events[0].entityType).toBe('printstatus')
    expect(events[0].orderId).toBe('order-1')
    // payload mirrored MINUS the base64 ticket.
    expect(events[0].payload.payload).toBeUndefined()
    expect(events[0].payload.id).toBe('job-1')
    expect(events[0].payload.printerId).toBe('printer-1')
  })

  it('is a no-op when cloud sync is disabled', async () => {
    const { db } = makeFakeDb()
    const { deps, recordOutboxEvents } = makeDeps({ isCloudSyncEnabled: () => false })

    const job: CreatedJob = {
      id: 'job-1', source: 'sales', refType: 'order', refId: 'order-1',
      teamId: 'team-1', eventId: 'event-1', status: '0', payload: 'X', printerId: 'p1'
    }
    await onJobCreated(db, job, deps)

    expect(recordOutboxEvents).not.toHaveBeenCalled()
  })
})
