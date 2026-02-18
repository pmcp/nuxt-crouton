// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingsAppPromotion } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { promotionId } = getRouterParams(event)
  if (!promotionId) {
    throw createError({ status: 400, statusText: 'Missing promotion ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingsAppPromotion(promotionId, team.id, user.id)
})