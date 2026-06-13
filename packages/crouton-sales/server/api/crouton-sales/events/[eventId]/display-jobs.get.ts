/**
 * KDS read model — display jobs off the print queue (#61, the `display` driver).
 *
 * The kitchen display reads `salesPrintqueues` directly: every `display`-driver
 * station enqueues a `printMode: 'display'` job whose `printData` is a JSON
 * `DisplayPayload` (built by `toDisplayPayload`). The queue row — not a separate
 * orders feed — is the source of truth, so the screen shows exactly what was
 * routed to it, and "bump" closes the same row.
 *
 * Lifecycle rides the existing numeric status codes so the admin order LEDs keep
 * working unchanged: pending '0' → shown '1' → bumped '2'. This returns
 * everything not yet bumped and flips pending → shown on read, recording that
 * the job reached a screen (mirrors the spooler's `mark_as_printing` flip on the
 * thermal jobs endpoint).
 *
 * Auth: none — a KDS is an unattended screen on the trusted venue LAN (the
 * firewall is the boundary; see the venue local-first architecture doc). The
 * block is normally placed on a scoped page, so the page gate guards access.
 * Tightening this to a helper-scoped token is a productionization follow-up.
 *
 * Reads the consuming app's generated `sales` layer schema (the package ships
 * the logic; the app owns the tables).
 */
import { and, asc, eq, inArray } from 'drizzle-orm'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'

const STATUS_PENDING = '0'
const STATUS_SHOWN = '1'
const STATUS_BUMPED = '2'

interface DisplayJobItem { title: string, quantity: number, remarks?: string }
interface DisplayPayload {
  orderNumber: string
  clientName?: string
  isPersonnel?: boolean
  createdAt: string
  items: DisplayJobItem[]
}

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({ status: 400, statusText: 'eventId is required' })
  }

  const db = useDB()

  // Oldest first — a kitchen works orders in the sequence they arrived.
  const rows = await db
    .select({
      id: salesPrintqueues.id,
      orderId: salesPrintqueues.orderId,
      printerId: salesPrintqueues.printerId,
      status: salesPrintqueues.status,
      printData: salesPrintqueues.printData,
      createdAt: salesPrintqueues.createdAt
    })
    .from(salesPrintqueues)
    .where(and(
      eq(salesPrintqueues.eventId, eventId),
      eq(salesPrintqueues.printMode, 'display')
    ))
    .orderBy(asc(salesPrintqueues.createdAt))

  // Anything not yet bumped is still on the board (a screen render can't fail
  // like a printer can, so there's no failed display state).
  const open = rows.filter((r: any) => r.status !== STATUS_BUMPED)

  // Record that pending jobs have now reached a screen (pending → shown).
  const pendingIds = open.filter((r: any) => r.status === STATUS_PENDING).map((r: any) => r.id)
  if (pendingIds.length > 0) {
    await db
      .update(salesPrintqueues)
      .set({ status: STATUS_SHOWN, updatedAt: new Date() })
      .where(inArray(salesPrintqueues.id, pendingIds))
  }

  const jobs = open.map((r: any) => {
    let payload: DisplayPayload
    try {
      payload = JSON.parse(r.printData) as DisplayPayload
    }
    catch {
      // A malformed payload shouldn't sink the whole board — show a stub the
      // kitchen can still bump to clear.
      payload = { orderNumber: '—', createdAt: new Date(r.createdAt).toISOString(), items: [] }
    }
    return {
      id: r.id,
      orderId: r.orderId,
      stationId: r.printerId,
      orderNumber: payload.orderNumber,
      clientName: payload.clientName ?? null,
      isPersonnel: payload.isPersonnel ?? false,
      createdAt: payload.createdAt,
      items: payload.items ?? []
    }
  })

  return { jobs }
})
