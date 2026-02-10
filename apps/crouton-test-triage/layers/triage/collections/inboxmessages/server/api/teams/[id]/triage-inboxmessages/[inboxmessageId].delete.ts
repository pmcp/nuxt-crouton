// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageInboxMessage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { inboxMessageId } = getRouterParams(event)
  if (!inboxMessageId) {
    throw createError({ status: 400, statusText: 'Missing inboxmessage ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageInboxMessage(inboxMessageId, team.id, user.id)
})