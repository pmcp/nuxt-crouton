// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageUserMapping } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { userMappingId } = getRouterParams(event)
  if (!userMappingId) {
    throw createError({ status: 400, statusText: 'Missing usermapping ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageUserMapping(userMappingId, team.id, user.id)
})