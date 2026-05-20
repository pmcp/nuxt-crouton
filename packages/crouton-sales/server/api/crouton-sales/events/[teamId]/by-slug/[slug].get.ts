import { eq, and } from 'drizzle-orm'
import { resolveTeamBySlugOrId } from '@fyit/crouton-auth/server/utils/team'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'

// Public endpoint: resolve event by slug for helper login flow.
// `teamId` param accepts either the team's UUID or slug.
export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamBySlugOrId(event, 'teamId')
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ status: 400, statusText: 'Slug is required' })
  }

  const db = useDB()

  const [salesEvent] = await db
    .select({
      id: salesEvents.id,
      teamId: salesEvents.teamId,
      title: salesEvents.title,
      slug: salesEvents.slug,
      status: salesEvents.status
    })
    .from(salesEvents)
    .where(and(eq(salesEvents.teamId, team.id), eq(salesEvents.slug, slug)))
    .limit(1)

  if (!salesEvent) {
    throw createError({ status: 404, statusText: 'Event not found' })
  }

  return salesEvent
})
