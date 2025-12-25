// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesPrintQueue } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { printqueueId } = getRouterParams(event)
  if (!printqueueId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing printqueue ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesPrintQueue(printqueueId, team.id, user.id)
})