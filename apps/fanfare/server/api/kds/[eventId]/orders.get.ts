/**
 * KDS (kitchen-display) order feed — spike for the `display` output driver (#60).
 *
 * App-level read model: returns recent orders for an event with their items
 * resolved to product titles, so a screen (iPad) can render them instead of
 * printing. Rides the existing sales tables; no package changes.
 */
import { desc, eq, inArray } from 'drizzle-orm'
import { salesOrders } from '~~/layers/sales/collections/orders/server/database/schema'
import { salesOrderitems } from '~~/layers/sales/collections/orderitems/server/database/schema'
import { salesProducts } from '~~/layers/sales/collections/products/server/database/schema'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({ status: 400, statusText: 'eventId is required' })
  }

  const db = useDB()

  const orders = await db
    .select()
    .from(salesOrders)
    .where(eq(salesOrders.eventId, eventId))
    .orderBy(desc(salesOrders.createdAt))
    .limit(50)

  if (orders.length === 0) {
    return { orders: [] }
  }

  const orderIds = orders.map(o => o.id)
  const [items, products] = await Promise.all([
    db.select().from(salesOrderitems).where(inArray(salesOrderitems.orderId, orderIds)),
    db.select().from(salesProducts).where(eq(salesProducts.eventId, eventId))
  ])

  const titleById = new Map(products.map(p => [p.id, p.title]))
  const itemsByOrder = new Map<string, Array<{ title: string, quantity: number, remarks: string | null }>>()
  for (const it of items) {
    const arr = itemsByOrder.get(it.orderId) ?? []
    arr.push({ title: titleById.get(it.productId) ?? 'Item', quantity: it.quantity, remarks: it.remarks })
    itemsByOrder.set(it.orderId, arr)
  }

  return {
    orders: orders.map(o => ({
      id: o.id,
      number: o.eventOrderNumber,
      clientName: o.clientName,
      owner: o.owner,
      isPersonnel: o.isPersonnel,
      status: o.status,
      createdAt: o.createdAt,
      items: itemsByOrder.get(o.id) ?? []
    }))
  }
})
