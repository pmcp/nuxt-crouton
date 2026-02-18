// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingsAppService } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { serviceId } = getRouterParams(event)
  if (!serviceId) {
    throw createError({ status: 400, statusText: 'Missing service ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingsAppService(serviceId, team.id, user.id)
})