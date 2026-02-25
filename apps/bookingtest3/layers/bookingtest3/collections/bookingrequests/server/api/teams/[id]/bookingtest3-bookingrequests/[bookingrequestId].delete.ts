// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingtest3BookingRequest } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { bookingRequestId } = getRouterParams(event)
  if (!bookingRequestId) {
    throw createError({ status: 400, statusText: 'Missing bookingrequest ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingtest3BookingRequest(bookingRequestId, team.id, user.id, { role: membership.role })
})