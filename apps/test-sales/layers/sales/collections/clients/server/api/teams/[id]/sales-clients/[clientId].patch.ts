// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesClient } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { SalesClient } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { clientId } = getRouterParams(event)
  if (!clientId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing client ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesClient>>(event)

  return await updateSalesClient(clientId, team.id, user.id, {
    id: body.id,
    title: body.title,
    isReusable: body.isReusable
  })
})