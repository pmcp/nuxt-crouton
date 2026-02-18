// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { getAllBookingsAppExt:bookings:bookings, getBookingsAppExt:bookings:bookingsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const query = getQuery(event)
  if (query.ids) {
    const ids = String(query.ids).split(',')
    return await getBookingsAppExt:bookings:bookingsByIds(team.id, ids)
  }

  return await getAllBookingsAppExt:bookings:bookings(team.id)
})