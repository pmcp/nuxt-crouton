import { eq, and, desc } from 'drizzle-orm'
import { contentNews, organization } from '~~/server/db/schema'

const TEAM_SLUG = 'sintlukas'

export default defineEventHandler(async () => {
  const db = useDB()

  const [team] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, TEAM_SLUG))
    .limit(1)

  if (!team) {
    throw createError({ status: 500, statusText: 'Team not found' })
  }

  return db
    .select()
    .from(contentNews)
    .where(and(
      eq(contentNews.teamId, team.id),
      eq(contentNews.status, 'published')
    ))
    .orderBy(desc(contentNews.date))
})
