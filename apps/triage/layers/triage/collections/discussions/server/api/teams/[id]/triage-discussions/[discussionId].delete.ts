// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageDiscussion } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { discussionId } = getRouterParams(event)
  if (!discussionId) {
    throw createError({ status: 400, statusText: 'Missing discussion ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageDiscussion(discussionId, team.id, user.id)
})