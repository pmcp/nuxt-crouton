// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingsAppStaff } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { staffId } = getRouterParams(event)
  if (!staffId) {
    throw createError({ status: 400, statusText: 'Missing staff ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingsAppStaff(staffId, team.id, user.id)
})