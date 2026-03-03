// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageUser } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { userId } = getRouterParams(event)
  if (!userId) {
    throw createError({ status: 400, statusText: 'Missing user ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageUser(userId, team.id, user.id)
})