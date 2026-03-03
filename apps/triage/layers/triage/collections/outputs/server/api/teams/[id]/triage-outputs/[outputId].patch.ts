// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageOutput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageOutput } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { outputId } = getRouterParams(event)
  if (!outputId) {
    throw createError({ status: 400, statusText: 'Missing output ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageOutput>>(event)

  return await updateTriageOutput(outputId, team.id, user.id, {
    flowId: body.flowId,
    outputType: body.outputType,
    domainFilter: body.domainFilter,
    isDefault: body.isDefault,
    outputConfig: body.outputConfig,
    accountId: body.accountId,
    active: body.active
  })
})