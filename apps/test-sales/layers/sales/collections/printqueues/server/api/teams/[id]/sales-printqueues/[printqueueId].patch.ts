// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesPrintQueue } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { SalesPrintQueue } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { printqueueId } = getRouterParams(event)
  if (!printqueueId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing printqueue ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesPrintQueue>>(event)

  return await updateSalesPrintQueue(printqueueId, team.id, user.id, {
    id: body.id,
    eventId: body.eventId,
    orderId: body.orderId,
    printerId: body.printerId,
    locationId: body.locationId,
    status: body.status,
    printData: body.printData,
    printMode: body.printMode,
    errorMessage: body.errorMessage,
    retryCount: body.retryCount,
    completedAt: body.completedAt
  })
})