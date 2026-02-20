// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentTestimonial } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentTestimonial } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { testimonialId } = getRouterParams(event)
  if (!testimonialId) {
    throw createError({ status: 400, statusText: 'Missing testimonial ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ContentTestimonial>>(event)

  return await updateContentTestimonial(testimonialId, team.id, user.id, {
    author: body.author,
    company: body.company,
    role: body.role,
    quote: body.quote,
    rating: body.rating,
    featured: body.featured,
    avatar: body.avatar
  })
})