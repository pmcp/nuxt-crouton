// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesOrder } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { orderId } = getRouterParams(event)
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing order ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesOrder(orderId, team.id, user.id)
})