// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deletePlaygroundDecision } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { decisionId } = getRouterParams(event)
  if (!decisionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing decision ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deletePlaygroundDecision(decisionId, team.id, user.id)
})