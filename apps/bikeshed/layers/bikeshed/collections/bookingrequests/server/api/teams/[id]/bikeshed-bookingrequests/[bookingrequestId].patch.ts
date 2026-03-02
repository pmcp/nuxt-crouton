// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingtest3BookingRequest } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { Bookingtest3BookingRequest } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { bookingRequestId } = getRouterParams(event)
  if (!bookingRequestId) {
    throw createError({ status: 400, statusText: 'Missing bookingrequest ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<Bookingtest3BookingRequest>>(event)

  return await updateBookingtest3BookingRequest(bookingRequestId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  }, { role: membership.role })
})