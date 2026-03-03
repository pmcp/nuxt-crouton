// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageFlow } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { flowId } = getRouterParams(event)
  if (!flowId) {
    throw createError({ status: 400, statusText: 'Missing flow ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageFlow(flowId, team.id, user.id)
})