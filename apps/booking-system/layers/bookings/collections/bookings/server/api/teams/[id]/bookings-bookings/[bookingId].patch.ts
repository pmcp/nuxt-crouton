// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsBooking } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { BookingsBooking } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { bookingId } = getRouterParams(event)
  if (!bookingId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing booking ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsBooking>>(event)

  return await updateBookingsBooking(bookingId, team.id, user.id, {
    id: body.id,
    location: body.location,
    date: body.date ? new Date(body.date) : body.date,
    slot: body.slot,
    group: body.group,
    status: body.status
  })
})