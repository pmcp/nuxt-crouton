// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsAppCustomer } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BookingsAppCustomer } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { customerId } = getRouterParams(event)
  if (!customerId) {
    throw createError({ status: 400, statusText: 'Missing customer ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsAppCustomer>>(event)

  return await updateBookingsAppCustomer(customerId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  })
})