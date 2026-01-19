// Team-based endpoint - requires @fyit/crouton package
// The #crouton/team-auth alias is provided by @fyit/crouton
// Install: pnpm add @fyit/crouton
// Config: Add '@fyit/crouton' to extends array in nuxt.config.ts
import { deleteRakimFlowInput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'

export default defineEventHandler(async (event) => {
  const { flowinputId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteRakimFlowInput(flowinputId, team.id, user.id)
})