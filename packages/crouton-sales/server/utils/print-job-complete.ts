/**
 * @crouton-package crouton-sales
 * @description Shared queue status transitions for non-thermal drainers.
 *
 * Mirrors the thermal spooler callbacks (`print-server/jobs/[jobId]/{complete,fail}`)
 * — including order auto-complete / `print_failed` — so the browser-print
 * drainer converges on the exact same `salesPrintqueues` lifecycle and order
 * LEDs. The thermal callbacks are deliberately left as their own inline copies:
 * their byte-for-byte behavior is load-bearing for the RUT956 spooler and must
 * not move under it.
 *
 * App-layer schema is imported lazily: this file lives in `server/utils`, which
 * unbuild compiles, and the `~~/layers` alias only resolves in the consuming
 * app (same pattern as `generate-print-queues.ts`).
 */
import { and, count, eq, ne, notInArray, sql } from 'drizzle-orm'
import { isCloudSyncEnabled, recordOutboxEvents, type OutboxEvent } from './sync-outbox'

// salesPrintqueues.status is text-typed in the generated schema — string literals.
const STATUS_COMPLETED = '2'
const STATUS_FAILED = '9'

async function loadSchema() {
  const { salesPrintqueues } = await import('~~/layers/sales/collections/printqueues/server/database/schema')
  const { salesOrders } = await import('~~/layers/sales/collections/orders/server/database/schema')
  return { salesPrintqueues, salesOrders }
}

/**
 * Mark a print job completed; auto-complete the order once none of its jobs
 * remain in a non-completed state (a failed ticket keeps the order open until
 * reprinted). Returns `found: false` for an unknown job id.
 */
export async function completePrintJob(
  db: any,
  jobId: string
): Promise<{ found: boolean, orderCompleted: boolean }> {
  const { salesPrintqueues, salesOrders } = await loadSchema()
  const now = new Date()

  const result = await db
    .update(salesPrintqueues)
    .set({ status: STATUS_COMPLETED, completedAt: now.toISOString(), updatedAt: now })
    .where(eq(salesPrintqueues.id, jobId))
    .returning({ id: salesPrintqueues.id, orderId: salesPrintqueues.orderId })

  if (result.length === 0) return { found: false, orderCompleted: false }

  const orderId = result[0]?.orderId
  let orderCompleted = false
  if (orderId) {
    const [remaining] = await db
      .select({ n: count() })
      .from(salesPrintqueues)
      .where(and(
        eq(salesPrintqueues.orderId, orderId),
        ne(salesPrintqueues.status, STATUS_COMPLETED)
      ))

    if (!remaining || remaining.n === 0) {
      await db
        .update(salesOrders)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(salesOrders.id, orderId))
      orderCompleted = true
    }
  }

  // Mirror the print-status transition (#176): the job → done, plus the order
  // row when it auto-completed. No-op unless CROUTON_SALES_CLOUD_SYNC is on
  // (guard the order re-select too, so disabled processes pay nothing).
  if (isCloudSyncEnabled() && orderId) {
    const events: OutboxEvent[] = [{
      entityType: 'printstatus',
      entityId: jobId,
      orderId,
      payload: { id: jobId, status: STATUS_COMPLETED, completedAt: now.toISOString(), updatedAt: now },
    }]
    if (orderCompleted) {
      const [orderRow] = await db.select().from(salesOrders).where(eq(salesOrders.id, orderId)).limit(1)
      if (orderRow) {
        events.push({ entityType: 'order', entityId: orderId, orderId, teamId: orderRow.teamId, eventId: orderRow.eventId, payload: orderRow })
      }
    }
    await recordOutboxEvents(db, events)
  }

  return { found: true, orderCompleted }
}

/**
 * Mark a print job failed (bumps retryCount) and flag the order `print_failed`
 * (unless already completed/cancelled), so the orders list surfaces it.
 */
export async function failPrintJob(
  db: any,
  jobId: string,
  errorMessage: string
): Promise<{ found: boolean }> {
  const { salesPrintqueues, salesOrders } = await loadSchema()
  const now = new Date()

  const result = await db
    .update(salesPrintqueues)
    .set({
      status: STATUS_FAILED,
      errorMessage,
      retryCount: sql`COALESCE(${salesPrintqueues.retryCount}, 0) + 1`,
      updatedAt: now
    })
    .where(eq(salesPrintqueues.id, jobId))
    .returning({ id: salesPrintqueues.id, orderId: salesPrintqueues.orderId })

  if (result.length === 0) return { found: false }

  const orderId = result[0]?.orderId
  if (orderId) {
    await db
      .update(salesOrders)
      .set({ status: 'print_failed', updatedAt: now })
      .where(and(
        eq(salesOrders.id, orderId),
        notInArray(salesOrders.status, ['completed', 'cancelled'])
      ))
  }

  // Mirror the print-status transition (#176): the job → failed, plus the
  // current order row (its status may have flipped to print_failed).
  if (isCloudSyncEnabled() && orderId) {
    const events: OutboxEvent[] = [{
      entityType: 'printstatus',
      entityId: jobId,
      orderId,
      payload: { id: jobId, status: STATUS_FAILED, errorMessage, updatedAt: now },
    }]
    const [orderRow] = await db.select().from(salesOrders).where(eq(salesOrders.id, orderId)).limit(1)
    if (orderRow) {
      events.push({ entityType: 'order', entityId: orderId, orderId, teamId: orderRow.teamId, eventId: orderRow.eventId, payload: orderRow })
    }
    await recordOutboxEvents(db, events)
  }

  return { found: true }
}
