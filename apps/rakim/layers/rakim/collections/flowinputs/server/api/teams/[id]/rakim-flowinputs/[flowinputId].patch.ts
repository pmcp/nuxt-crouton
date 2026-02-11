// Team-based endpoint - requires @fyit/crouton package
// The #crouton/team-auth alias is provided by @fyit/crouton
// Install: pnpm add @fyit/crouton
// Config: Add '@fyit/crouton' to extends array in nuxt.config.ts
import { updateRakimFlowInput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { RakimFlowInput } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { flowinputId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<RakimFlowInput>>(event)

  return await updateRakimFlowInput(flowinputId, team.id, user.id, {
    flowId: body.flowId,
    sourceType: body.sourceType,
    apiToken: body.apiToken,
    webhookUrl: body.webhookUrl,
    webhookSecret: body.webhookSecret,
    emailAddress: body.emailAddress,
    emailSlug: body.emailSlug,
    sourceMetadata: body.sourceMetadata,
    active: body.active
  })
})