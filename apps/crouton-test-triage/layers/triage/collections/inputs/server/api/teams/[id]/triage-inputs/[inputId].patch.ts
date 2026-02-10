// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageInput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageInput } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { inputId } = getRouterParams(event)
  if (!inputId) {
    throw createError({ status: 400, statusText: 'Missing input ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageInput>>(event)

  return await updateTriageInput(inputId, team.id, user.id, {
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