// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsAppPromotion } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BookingsAppPromotion } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { promotionId } = getRouterParams(event)
  if (!promotionId) {
    throw createError({ status: 400, statusText: 'Missing promotion ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsAppPromotion>>(event)

  return await updateBookingsAppPromotion(promotionId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  })
})