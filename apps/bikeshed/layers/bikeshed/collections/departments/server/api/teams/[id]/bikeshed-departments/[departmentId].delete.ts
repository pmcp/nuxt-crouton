// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingtest3Department } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { departmentId } = getRouterParams(event)
  if (!departmentId) {
    throw createError({ status: 400, statusText: 'Missing department ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingtest3Department(departmentId, team.id, user.id, { role: membership.role })
})