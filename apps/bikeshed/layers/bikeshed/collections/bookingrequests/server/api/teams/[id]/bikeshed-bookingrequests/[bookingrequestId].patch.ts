// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBikeshedBookingRequest } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BikeshedBookingRequest } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { bookingRequestId } = getRouterParams(event)
  if (!bookingRequestId) {
    throw createError({ status: 400, statusText: 'Missing bookingrequest ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BikeshedBookingRequest>>(event)

  return await updateBikeshedBookingRequest(bookingRequestId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  }, { role: membership.role })
})