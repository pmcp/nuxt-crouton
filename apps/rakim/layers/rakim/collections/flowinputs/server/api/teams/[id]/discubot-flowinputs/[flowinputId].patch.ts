// Team-based endpoint - requires @friendlyinternet/nuxt-crouton package
// The #crouton/team-auth alias is provided by @friendlyinternet/nuxt-crouton
// Install: pnpm add @friendlyinternet/nuxt-crouton
// Config: Add '@friendlyinternet/nuxt-crouton' to extends array in nuxt.config.ts
import { updateDiscubotFlowInput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { DiscubotFlowInput } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { flowinputId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DiscubotFlowInput>>(event)

  return await updateDiscubotFlowInput(flowinputId, team.id, user.id, {
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