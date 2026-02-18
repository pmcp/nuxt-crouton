// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsAppReview } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BookingsAppReview } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { reviewId } = getRouterParams(event)
  if (!reviewId) {
    throw createError({ status: 400, statusText: 'Missing review ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsAppReview>>(event)

  return await updateBookingsAppReview(reviewId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  })
})