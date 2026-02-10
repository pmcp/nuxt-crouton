// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageFlowInput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageFlowInput } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { flowInputId } = getRouterParams(event)
  if (!flowInputId) {
    throw createError({ status: 400, statusText: 'Missing flowinput ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageFlowInput>>(event)

  return await updateTriageFlowInput(flowInputId, team.id, user.id, {
    flowId: body.flowId,
    sourceType: body.sourceType,
    name: body.name,
    apiToken: body.apiToken,
    webhookUrl: body.webhookUrl,
    webhookSecret: body.webhookSecret,
    emailAddress: body.emailAddress,
    emailSlug: body.emailSlug,
    sourceMetadata: body.sourceMetadata,
    active: body.active
  })
})