// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteRakimFlow } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { flowId } = getRouterParams(event)
  if (!flowId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing flow ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteRakimFlow(flowId, team.id, user.id)
})