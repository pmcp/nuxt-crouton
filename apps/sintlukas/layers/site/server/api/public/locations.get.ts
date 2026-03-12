import { eq } from 'drizzle-orm'
import { contentLocations, organization } from '~~/server/db/schema'

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
    .from(contentLocations)
    .where(eq(contentLocations.teamId, team.id))
    .orderBy(contentLocations.order)
})
