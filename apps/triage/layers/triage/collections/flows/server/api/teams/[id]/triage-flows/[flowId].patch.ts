// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageFlow } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageFlow } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { flowId } = getRouterParams(event)
  if (!flowId) {
    throw createError({ status: 400, statusText: 'Missing flow ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageFlow>>(event)

  // Encrypt API key and generate hint server-side when a new key is provided
  let anthropicApiKey: string | undefined
  let anthropicApiKeyHint: string | undefined
  if (body.anthropicApiKey) {
    anthropicApiKey = await encryptSecret(body.anthropicApiKey)
    anthropicApiKeyHint = maskSecret(body.anthropicApiKey)
  }

  return await updateTriageFlow(flowId, team.id, user.id, {
    name: body.name,
    description: body.description,
    availableDomains: body.availableDomains,
    aiEnabled: body.aiEnabled,
    ...(anthropicApiKey && { anthropicApiKey }),
    ...(anthropicApiKeyHint && { anthropicApiKeyHint }),
    aiSummaryPrompt: body.aiSummaryPrompt,
    aiTaskPrompt: body.aiTaskPrompt,
    replyPersonality: body.replyPersonality,
    personalityIcon: body.personalityIcon,
    active: body.active,
    onboardingComplete: body.onboardingComplete
  })
})