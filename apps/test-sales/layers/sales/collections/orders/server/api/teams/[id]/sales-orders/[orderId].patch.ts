// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesOrder } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { SalesOrder } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { orderId } = getRouterParams(event)
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing order ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesOrder>>(event)

  return await updateSalesOrder(orderId, team.id, user.id, {
    id: body.id,
    eventId: body.eventId,
    clientId: body.clientId,
    clientName: body.clientName,
    eventOrderNumber: body.eventOrderNumber,
    overallRemarks: body.overallRemarks,
    isPersonnel: body.isPersonnel,
    status: body.status
  })
})