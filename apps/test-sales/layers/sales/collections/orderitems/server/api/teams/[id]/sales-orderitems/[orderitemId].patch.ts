// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesOrderItem } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { SalesOrderItem } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { orderitemId } = getRouterParams(event)
  if (!orderitemId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing orderitem ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesOrderItem>>(event)

  return await updateSalesOrderItem(orderitemId, team.id, user.id, {
    id: body.id,
    orderId: body.orderId,
    productId: body.productId,
    quantity: body.quantity,
    unitPrice: body.unitPrice,
    totalPrice: body.totalPrice,
    remarks: body.remarks,
    selectedOptions: body.selectedOptions
  })
})