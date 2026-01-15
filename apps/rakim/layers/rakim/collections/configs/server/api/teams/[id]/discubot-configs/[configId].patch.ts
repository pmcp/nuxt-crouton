// Team-based endpoint - requires @friendlyinternet/nuxt-crouton package
// The #crouton/team-auth alias is provided by @friendlyinternet/nuxt-crouton
// Install: pnpm add @friendlyinternet/nuxt-crouton
// Config: Add '@friendlyinternet/nuxt-crouton' to extends array in nuxt.config.ts
import { updateDiscubotConfig } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { DiscubotConfig } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { configId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DiscubotConfig>>(event)

  return await updateDiscubotConfig(configId, team.id, user.id, {
    sourceType: body.sourceType,
    name: body.name,
    emailAddress: body.emailAddress,
    emailSlug: body.emailSlug,
    webhookUrl: body.webhookUrl,
    webhookSecret: body.webhookSecret,
    apiToken: body.apiToken,
    notionToken: body.notionToken,
    notionDatabaseId: body.notionDatabaseId,
    notionFieldMapping: body.notionFieldMapping,
    anthropicApiKey: body.anthropicApiKey,
    aiEnabled: body.aiEnabled,
    aiSummaryPrompt: body.aiSummaryPrompt,
    aiTaskPrompt: body.aiTaskPrompt,
    autoSync: body.autoSync,
    postConfirmation: body.postConfirmation,
    enableEmailForwarding: body.enableEmailForwarding,
    active: body.active,
    onboardingComplete: body.onboardingComplete,
    sourceMetadata: body.sourceMetadata
  })
})