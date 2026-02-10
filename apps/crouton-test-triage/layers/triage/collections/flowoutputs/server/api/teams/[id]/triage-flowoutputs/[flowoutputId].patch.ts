// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageFlowOutput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageFlowOutput } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { flowOutputId } = getRouterParams(event)
  if (!flowOutputId) {
    throw createError({ status: 400, statusText: 'Missing flowoutput ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageFlowOutput>>(event)

  return await updateTriageFlowOutput(flowOutputId, team.id, user.id, {
    flowId: body.flowId,
    outputType: body.outputType,
    name: body.name,
    domainFilter: body.domainFilter,
    isDefault: body.isDefault,
    outputConfig: body.outputConfig,
    active: body.active
  })
})