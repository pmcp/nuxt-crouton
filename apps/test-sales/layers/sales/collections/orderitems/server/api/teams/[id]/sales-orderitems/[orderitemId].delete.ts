// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesOrderItem } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { orderitemId } = getRouterParams(event)
  if (!orderitemId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing orderitem ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesOrderItem(orderitemId, team.id, user.id)
})