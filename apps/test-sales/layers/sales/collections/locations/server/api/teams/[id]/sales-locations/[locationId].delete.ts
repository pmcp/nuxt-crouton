// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesLocation } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { locationId } = getRouterParams(event)
  if (!locationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing location ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesLocation(locationId, team.id, user.id)
})