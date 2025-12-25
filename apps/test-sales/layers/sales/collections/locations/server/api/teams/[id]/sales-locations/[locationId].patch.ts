// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesLocation } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { SalesLocation } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { locationId } = getRouterParams(event)
  if (!locationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing location ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesLocation>>(event)

  return await updateSalesLocation(locationId, team.id, user.id, {
    id: body.id,
    eventId: body.eventId,
    title: body.title
  })
})