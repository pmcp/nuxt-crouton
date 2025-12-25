// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesProduct } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { productId } = getRouterParams(event)
  if (!productId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesProduct(productId, team.id, user.id)
})