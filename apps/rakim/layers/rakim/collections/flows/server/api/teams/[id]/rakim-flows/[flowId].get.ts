// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { getRakimFlowById } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { flowId } = getRouterParams(event)
  const { team } = await resolveTeamAndCheckMembership(event)

  return await getRakimFlowById(team.id, flowId)
})
