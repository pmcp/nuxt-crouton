// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteContentTestimonial } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { testimonialId } = getRouterParams(event)
  if (!testimonialId) {
    throw createError({ status: 400, statusText: 'Missing testimonial ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteContentTestimonial(testimonialId, team.id, user.id)
})