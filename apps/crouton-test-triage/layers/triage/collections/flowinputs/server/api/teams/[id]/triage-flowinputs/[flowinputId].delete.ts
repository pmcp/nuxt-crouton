// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageFlowInput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { flowInputId } = getRouterParams(event)
  if (!flowInputId) {
    throw createError({ status: 400, statusText: 'Missing flowinput ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageFlowInput(flowInputId, team.id, user.id)
})