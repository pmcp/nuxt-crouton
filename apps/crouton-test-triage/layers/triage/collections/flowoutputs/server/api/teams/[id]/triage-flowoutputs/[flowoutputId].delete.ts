// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageFlowOutput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { flowOutputId } = getRouterParams(event)
  if (!flowOutputId) {
    throw createError({ status: 400, statusText: 'Missing flowoutput ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageFlowOutput(flowOutputId, team.id, user.id)
})