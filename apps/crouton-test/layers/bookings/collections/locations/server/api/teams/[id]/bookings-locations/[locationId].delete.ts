// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingsLocation } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { locationId } = getRouterParams(event)
  if (!locationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing location ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingsLocation(locationId, team.id, user.id)
})