// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingtest3Member } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { memberId } = getRouterParams(event)
  if (!memberId) {
    throw createError({ status: 400, statusText: 'Missing member ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingtest3Member(memberId, team.id, user.id, { role: membership.role })
})