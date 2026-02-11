// Team-based endpoint - requires @fyit/crouton package
// The #crouton/team-auth alias is provided by @fyit/crouton
// Install: pnpm add @fyit/crouton
// Config: Add '@fyit/crouton' to extends array in nuxt.config.ts
import { updateRakimFlowOutput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { RakimFlowOutput } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { flowoutputId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<RakimFlowOutput>>(event)

  return await updateRakimFlowOutput(flowoutputId, team.id, user.id, {
    flowId: body.flowId,
    outputType: body.outputType,
    domainFilter: body.domainFilter,
    isDefault: body.isDefault,
    outputConfig: body.outputConfig,
    active: body.active
  })
})