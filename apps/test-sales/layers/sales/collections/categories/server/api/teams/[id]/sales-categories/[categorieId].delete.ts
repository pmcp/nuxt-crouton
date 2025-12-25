// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesCategorie } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { categorieId } = getRouterParams(event)
  if (!categorieId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing categorie ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesCategorie(categorieId, team.id, user.id)
})