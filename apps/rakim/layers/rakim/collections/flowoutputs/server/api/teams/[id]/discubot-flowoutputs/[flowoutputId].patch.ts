// Team-based endpoint - requires @friendlyinternet/nuxt-crouton package
// The #crouton/team-auth alias is provided by @friendlyinternet/nuxt-crouton
// Install: pnpm add @friendlyinternet/nuxt-crouton
// Config: Add '@friendlyinternet/nuxt-crouton' to extends array in nuxt.config.ts
import { updateDiscubotFlowOutput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { DiscubotFlowOutput } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { flowoutputId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DiscubotFlowOutput>>(event)

  return await updateDiscubotFlowOutput(flowoutputId, team.id, user.id, {
    flowId: body.flowId,
    outputType: body.outputType,
    name: body.name,
    domainFilter: body.domainFilter,
    isDefault: body.isDefault,
    outputConfig: body.outputConfig,
    active: body.active
  })
})