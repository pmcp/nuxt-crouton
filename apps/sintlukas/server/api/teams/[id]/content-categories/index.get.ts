/**
 * Public-friendly categories endpoint.
 * Overrides the generated collection endpoint to allow unauthenticated access.
 */
import { eq, and } from 'drizzle-orm'
import { contentCategories } from '~~/layers/content/collections/categories/server/database/schema'
import { organization } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const teamParam = getRouterParam(event, 'id')

  if (!teamParam) {
    throw createError({ status: 400, statusText: 'Team ID required' })
  }

  // Resolve team by slug or ID
  const teamRecord = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, teamParam))
    .limit(1)
    .then(rows => rows[0])

  const teamId = teamRecord?.id || teamParam

  const categories = await db
    .select()
    .from(contentCategories)
    .where(eq(contentCategories.teamId, teamId))
    .orderBy(contentCategories.order)

  return { items: categories }
})
