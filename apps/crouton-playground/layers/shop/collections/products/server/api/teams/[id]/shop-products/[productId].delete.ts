// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteShopProduct } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { productId } = getRouterParams(event)
  if (!productId) {
    throw createError({ status: 400, statusText: 'Missing product ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteShopProduct(productId, team.id, user.id)
})