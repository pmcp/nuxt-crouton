// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesEvent } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { eventId } = getRouterParams(event)
  if (!eventId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing event ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesEvent(eventId, team.id, user.id)
})