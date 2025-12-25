// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesPrinter } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { SalesPrinter } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { printerId } = getRouterParams(event)
  if (!printerId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing printer ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesPrinter>>(event)

  return await updateSalesPrinter(printerId, team.id, user.id, {
    id: body.id,
    eventId: body.eventId,
    locationId: body.locationId,
    title: body.title,
    ipAddress: body.ipAddress,
    port: body.port,
    status: body.status,
    showPrices: body.showPrices,
    isActive: body.isActive
  })
})