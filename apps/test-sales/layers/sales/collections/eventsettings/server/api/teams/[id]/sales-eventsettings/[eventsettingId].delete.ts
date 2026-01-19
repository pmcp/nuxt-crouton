// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesEventSetting } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { eventsettingId } = getRouterParams(event)
  if (!eventsettingId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing eventsetting ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesEventSetting(eventsettingId, team.id, user.id)
})