// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsAppService } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BookingsAppService } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { serviceId } = getRouterParams(event)
  if (!serviceId) {
    throw createError({ status: 400, statusText: 'Missing service ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsAppService>>(event)

  return await updateBookingsAppService(serviceId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  })
})