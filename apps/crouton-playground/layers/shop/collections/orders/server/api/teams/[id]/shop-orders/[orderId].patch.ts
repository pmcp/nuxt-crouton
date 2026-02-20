// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateShopOrder } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ShopOrder } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { orderId } = getRouterParams(event)
  if (!orderId) {
    throw createError({ status: 400, statusText: 'Missing order ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ShopOrder>>(event)

  return await updateShopOrder(orderId, team.id, user.id, {
    orderNumber: body.orderNumber,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    productId: body.productId,
    quantity: body.quantity,
    total: body.total,
    isPaid: body.isPaid,
    orderedAt: body.orderedAt ? new Date(body.orderedAt) : body.orderedAt,
    shippingAddress: body.shippingAddress
  })
})