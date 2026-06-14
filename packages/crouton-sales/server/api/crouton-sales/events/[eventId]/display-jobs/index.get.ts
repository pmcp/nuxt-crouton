/**
 * KDS read model — live order tickets per location (#61, decoupled KDS).
 *
 * The kitchen display is a standalone view, not a printer: it reads the event's
 * orders directly and splits each into one ticket per location (an order's fries
 * go to the kitchen screen, its beer to the bar screen). It does NOT touch
 * `salesPrintqueues` — printers and screens are independent consumers of the
 * same per-location order stream.
 *
 * A ticket is keyed by `(order × location)` so the kitchen and bar screens clear
 * the same order independently; "done" lives in `salesKdsbumps`, one row per
 * cleared `(order, location)`. This endpoint returns every `(order, location)`
 * that isn't bumped yet. Bumping never changes the order's own status — order
 * lifecycle is separate from what a screen shows.
 *
 * Query: `?locations=locA,locB` scopes to the block's configured locations
 * (empty = every location in the event). Auth: none — an unattended screen on
 * the trusted venue LAN (the page gate guards access); a helper-scoped token is
 * a follow-up.
 *
 * Reads the consuming app's generated `sales` layer schemas (the package ships
 * the logic; the app owns the tables).
 */
import { and, asc, eq, inArray, ne } from 'drizzle-orm'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'
import { salesOrderitems } from '~~/layers/sales/collections/orderitems/server/database/schema'
import { salesProducts } from '~~/layers/sales/collections/products/server/database/schema'
import { salesKdsbumps } from '~~/layers/sales/collections/kdsbumps/server/database/schema'

interface DisplayJobItem { title: string, quantity: number, remarks?: string }

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({ status: 400, statusText: 'eventId is required' })
  }

  // Block-configured locations to show; empty/absent = every location.
  const locationFilter = (getQuery(event).locations as string | undefined)
    ?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  const wants = (locationId: string | null): locationId is string =>
    !!locationId && (locationFilter.length === 0 || locationFilter.includes(locationId))

  const db = useDB()

  // Open orders, oldest first — a kitchen works orders in arrival order.
  const orders = await db
    .select({
      id: salesOrders.id,
      orderNumber: salesOrders.eventOrderNumber,
      clientName: salesOrders.clientName,
      isPersonnel: salesOrders.isPersonnel,
      createdAt: salesOrders.createdAt
    })
    .from(salesOrders)
    .where(and(
      eq(salesOrders.eventId, eventId),
      ne(salesOrders.status, 'cancelled')
    ))
    .orderBy(asc(salesOrders.createdAt))

  if (orders.length === 0) return { jobs: [] }
  // useDB() is loosely typed, so drizzle rows come back as `any` — annotate the
  // callbacks (matches the rest of this package's server code).
  const orderIds = orders.map((o: any) => o.id)

  // Items + their product (for location routing + title), and the bump set.
  const [items, products, bumps] = await Promise.all([
    db.select({
      orderId: salesOrderitems.orderId,
      productId: salesOrderitems.productId,
      quantity: salesOrderitems.quantity,
      remarks: salesOrderitems.remarks
    }).from(salesOrderitems).where(inArray(salesOrderitems.orderId, orderIds)),
    db.select({
      id: salesProducts.id,
      title: salesProducts.title,
      locationId: salesProducts.locationId
    }).from(salesProducts).where(eq(salesProducts.eventId, eventId)),
    db.select({
      orderId: salesKdsbumps.orderId,
      locationId: salesKdsbumps.locationId
    }).from(salesKdsbumps).where(eq(salesKdsbumps.eventId, eventId))
  ])

  const productById = new Map<string, any>(products.map((p: any) => [p.id, p]))
  const bumped = new Set(bumps.map((b: any) => `${b.orderId}:${b.locationId}`))
  const itemsByOrder = new Map<string, typeof items>()
  for (const it of items) {
    const list = itemsByOrder.get(it.orderId) ?? []
    list.push(it)
    itemsByOrder.set(it.orderId, list)
  }

  // One ticket per (order × location): group the order's items by their
  // product's location, keep only wanted + not-yet-bumped locations.
  const jobs: Array<{
    id: string, orderId: string, locationId: string, orderNumber: string,
    clientName: string | null, isPersonnel: boolean, createdAt: string,
    items: DisplayJobItem[]
  }> = []

  for (const order of orders) {
    const byLocation = new Map<string, DisplayJobItem[]>()
    for (const it of itemsByOrder.get(order.id) ?? []) {
      const product = productById.get(it.productId)
      if (!wants(product?.locationId ?? null)) continue
      const locationId = product!.locationId!
      const list = byLocation.get(locationId) ?? []
      list.push({ title: product!.title, quantity: it.quantity, remarks: it.remarks ?? undefined })
      byLocation.set(locationId, list)
    }
    for (const [locationId, ticketItems] of byLocation) {
      if (bumped.has(`${order.id}:${locationId}`)) continue
      jobs.push({
        id: `${order.id}~${locationId}`,
        orderId: order.id,
        locationId,
        orderNumber: order.orderNumber != null ? String(order.orderNumber) : '—',
        clientName: order.clientName ?? null,
        isPersonnel: order.isPersonnel ?? false,
        createdAt: new Date(order.createdAt).toISOString(),
        items: ticketItems
      })
    }
  }

  return { jobs }
})
