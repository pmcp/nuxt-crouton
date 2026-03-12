/**
 * Public-friendly ateliers endpoint.
 * Overrides the generated collection endpoint to allow unauthenticated access
 * for the public site (binder pages need to fetch items without login).
 *
 * Falls back to auth-required for non-published items.
 */
import { eq, and, inArray } from 'drizzle-orm'
import { contentAteliers } from '~~/layers/content/collections/ateliers/server/database/schema'
import { contentCategories } from '~~/layers/content/collections/categories/server/database/schema'
import { contentPersons } from '~~/layers/content/collections/persons/server/database/schema'
import { organization } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)
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

  // Build conditions — always filter by team and published status
  const conditions = [
    eq(contentAteliers.teamId, teamId),
    eq(contentAteliers.status, 'published')
  ]

  // Filter by IDs if provided (used by binder detail mode)
  if (query.ids) {
    const ids = String(query.ids).split(',')
    conditions.push(inArray(contentAteliers.id, ids))
  }

  const ateliers = await db
    .select()
    .from(contentAteliers)
    .where(and(...conditions))
    .orderBy(contentAteliers.order)

  // Resolve persons references
  const allPersonIds = new Set<string>()
  for (const atelier of ateliers) {
    if (Array.isArray(atelier.persons)) {
      (atelier.persons as string[]).forEach(id => allPersonIds.add(id))
    }
  }

  let personsMap = new Map<string, any>()
  if (allPersonIds.size > 0) {
    const personRecords = await db
      .select()
      .from(contentPersons)
      .where(inArray(contentPersons.id, Array.from(allPersonIds)))
    personsMap = new Map(personRecords.map(p => [p.id, p]))
  }

  // Resolve category references
  const categoryIds = [...new Set(ateliers.map(a => a.category).filter(Boolean))]
  let categoriesMap = new Map<string, any>()
  if (categoryIds.length > 0) {
    const catRecords = await db
      .select()
      .from(contentCategories)
      .where(inArray(contentCategories.id, categoryIds))
    categoriesMap = new Map(catRecords.map(c => [c.id, c]))
  }

  // Enrich items — render TipTap JSON to HTML server-side
  const items = ateliers.map(atelier => ({
    ...atelier,
    contentHtml: atelier.content ? renderTipTapToHtml(atelier.content) : '',
    sidebarContentHtml: atelier.sidebarContent ? renderTipTapToHtml(atelier.sidebarContent) : '',
    categoryData: categoriesMap.get(atelier.category) || null,
    personsData: Array.isArray(atelier.persons)
      ? (atelier.persons as string[]).map(id => personsMap.get(id)).filter(Boolean)
      : []
  }))

  return { items }
})