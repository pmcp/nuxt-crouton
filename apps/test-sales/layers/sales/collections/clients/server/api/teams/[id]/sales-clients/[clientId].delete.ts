// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesClient } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { clientId } = getRouterParams(event)
  if (!clientId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing client ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesClient(clientId, team.id, user.id)
})