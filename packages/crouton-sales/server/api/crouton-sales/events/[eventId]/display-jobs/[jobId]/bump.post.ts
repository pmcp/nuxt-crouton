/**
 * KDS "bump" — mark a display job done (#61, the `display` driver).
 *
 * Closes the display lifecycle: shown '1' → bumped '2'. Bumped maps onto the
 * shared COMPLETED status so the admin order LEDs treat a bumped display job
 * exactly like a printed ticket — green/done. Mirrors the thermal
 * `print-server/jobs/[jobId]/complete` callback, including auto-completing the
 * order once none of its jobs remain open (so a display-only order — the
 * "no printer" venue — actually reaches `completed` when the kitchen bumps it).
 *
 * Scoped to the event + `printMode: 'display'`, so this can only ever close a
 * display job, never a thermal ticket. Auth: none, matching the read endpoint
 * (unattended screen on the trusted venue LAN; tightening to a helper-scoped
 * token is a follow-up).
 */
import { and, count, eq, ne } from 'drizzle-orm'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'

const STATUS_BUMPED = '2'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  const jobId = getRouterParam(event, 'jobId')
  if (!eventId || !jobId) {
    throw createError({ status: 400, statusText: 'eventId and jobId are required' })
  }

  const db = useDB()
  const now = new Date()

  // completedAt is a text column (CLI regression: schema says datetime, gets
  // generated as text) — store an ISO string, same as the thermal complete path.
  const result = await db
    .update(salesPrintqueues)
    .set({ status: STATUS_BUMPED, completedAt: now.toISOString(), updatedAt: now })
    .where(and(
      eq(salesPrintqueues.id, jobId),
      eq(salesPrintqueues.eventId, eventId),
      eq(salesPrintqueues.printMode, 'display')
    ))
    .returning({ id: salesPrintqueues.id, orderId: salesPrintqueues.orderId })

  if (result.length === 0) {
    throw createError({ status: 404, statusText: 'Display job not found' })
  }

  // Auto-complete the order once no job of any kind is still open — same rule
  // as the thermal complete callback (status '2' is the shared done state for
  // printed and bumped jobs alike). A display-only order has just this one job,
  // so bumping it completes the order.
  const orderId = result[0]?.orderId
  let orderCompleted = false
  if (orderId) {
    const [remaining] = await db
      .select({ n: count() })
      .from(salesPrintqueues)
      .where(and(
        eq(salesPrintqueues.orderId, orderId),
        ne(salesPrintqueues.status, STATUS_BUMPED)
      ))

    if (!remaining || remaining.n === 0) {
      await db
        .update(salesOrders)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(salesOrders.id, orderId))
      orderCompleted = true
    }
  }

  return { success: true, id: jobId, orderCompleted }
})
