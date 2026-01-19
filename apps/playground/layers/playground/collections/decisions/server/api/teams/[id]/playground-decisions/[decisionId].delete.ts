// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deletePlaygroundDecision } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { decisionId } = getRouterParams(event)
  if (!decisionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing decision ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deletePlaygroundDecision(decisionId, team.id, user.id)
})