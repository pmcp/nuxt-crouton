// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsAppExt:bookings:booking } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BookingsAppExt:bookings:booking } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { ext:bookings:bookingId } = getRouterParams(event)
  if (!ext:bookings:bookingId) {
    throw createError({ status: 400, statusText: 'Missing __ext:bookings:booking ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsAppExt:bookings:booking>>(event)

  return await updateBookingsAppExt:bookings:booking(ext:bookings:bookingId, team.id, user.id, {
    testcustomdata: body.testcustomdata
  })
})