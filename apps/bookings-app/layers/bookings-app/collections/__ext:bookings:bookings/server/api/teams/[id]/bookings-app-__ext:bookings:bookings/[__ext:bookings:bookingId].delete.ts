// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingsAppExt:bookings:booking } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { ext:bookings:bookingId } = getRouterParams(event)
  if (!ext:bookings:bookingId) {
    throw createError({ status: 400, statusText: 'Missing __ext:bookings:booking ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingsAppExt:bookings:booking(ext:bookings:bookingId, team.id, user.id)
})