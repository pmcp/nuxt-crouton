// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deletePlaygroundCategorie } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { categorieId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deletePlaygroundCategorie(categorieId, team.id, user.id)
})