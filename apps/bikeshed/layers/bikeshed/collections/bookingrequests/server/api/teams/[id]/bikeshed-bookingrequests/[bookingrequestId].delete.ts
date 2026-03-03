// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBikeshedBookingRequest } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { bookingRequestId } = getRouterParams(event)
  if (!bookingRequestId) {
    throw createError({ status: 400, statusText: 'Missing bookingrequest ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  return await deleteBikeshedBookingRequest(bookingRequestId, team.id, user.id, { role: membership.role })
})