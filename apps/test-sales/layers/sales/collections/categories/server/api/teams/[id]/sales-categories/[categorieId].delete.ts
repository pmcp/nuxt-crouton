// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesCategorie } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { categorieId } = getRouterParams(event)
  if (!categorieId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing categorie ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesCategorie(categorieId, team.id, user.id)
})