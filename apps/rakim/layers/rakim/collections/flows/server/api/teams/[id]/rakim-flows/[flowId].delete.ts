// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteRakimFlow } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { flowId } = getRouterParams(event)
  if (!flowId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing flow ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteRakimFlow(flowId, team.id, user.id)
})