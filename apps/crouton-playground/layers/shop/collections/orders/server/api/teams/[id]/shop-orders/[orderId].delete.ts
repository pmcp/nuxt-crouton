// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteShopOrder } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { orderId } = getRouterParams(event)
  if (!orderId) {
    throw createError({ status: 400, statusText: 'Missing order ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteShopOrder(orderId, team.id, user.id)
})