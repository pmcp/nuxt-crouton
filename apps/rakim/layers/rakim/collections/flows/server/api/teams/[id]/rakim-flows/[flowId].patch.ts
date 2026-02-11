// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateRakimFlow } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { RakimFlow } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { flowId } = getRouterParams(event)
  if (!flowId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing flow ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<RakimFlow>>(event)

  // Encrypt API key and generate hint server-side when a new key is provided
  let anthropicApiKey: string | undefined
  let anthropicApiKeyHint: string | undefined
  if (body.anthropicApiKey) {
    anthropicApiKey = await encryptSecret(body.anthropicApiKey)
    anthropicApiKeyHint = maskSecret(body.anthropicApiKey)
  }

  return await updateRakimFlow(flowId, team.id, user.id, {
    name: body.name,
    description: body.description,
    availableDomains: body.availableDomains,
    aiEnabled: body.aiEnabled,
    ...(anthropicApiKey && { anthropicApiKey }),
    ...(anthropicApiKeyHint && { anthropicApiKeyHint }),
    aiSummaryPrompt: body.aiSummaryPrompt,
    aiTaskPrompt: body.aiTaskPrompt,
    active: body.active,
    onboardingComplete: body.onboardingComplete
  })
})