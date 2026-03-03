// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageMessage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { messageId } = getRouterParams(event)
  if (!messageId) {
    throw createError({ status: 400, statusText: 'Missing message ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageMessage(messageId, team.id, user.id)
})