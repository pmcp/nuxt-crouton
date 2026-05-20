import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { listScopedTokensForResource } from '@fyit/crouton-auth/server/utils/scoped-access'

export default defineEventHandler(async (event) => {
  await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  return listScopedTokensForResource('event', eventId)
})
