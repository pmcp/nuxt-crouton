import { eq, and, inArray } from 'drizzle-orm'
import { contentAteliers, contentCategories, contentPersons, organization } from '~~/server/db/schema'

const TEAM_SLUG = 'sintlukas'

export default defineEventHandler(async () => {
  const db = useDB()

  // Resolve team ID from slug
  const [team] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, TEAM_SLUG))
    .limit(1)

  if (!team) {
    throw createError({ status: 500, statusText: 'Team not found' })
  }

  const ateliers = await db
    .select()
    .from(contentAteliers)
    .where(and(
      eq(contentAteliers.teamId, team.id),
      eq(contentAteliers.status, 'published')
    ))
    .orderBy(contentAteliers.order)

  // Resolve persons
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
    personsMap = new Map(personRecords.map((p: any) => [p.id, p]))
  }

  // Resolve categories
  const categoryIds = [...new Set(ateliers.map((a: any) => a.category as string).filter((x: any): x is string => Boolean(x)))]
  let categoriesMap = new Map<string, any>()
  if (categoryIds.length > 0) {
    const catRecords = await db
      .select()
      .from(contentCategories)
      .where(inArray(contentCategories.id, categoryIds as [string, ...string[]]))
    categoriesMap = new Map(catRecords.map((c: any) => [c.id, c]))
  }

  return ateliers.map((atelier: any) => ({
    ...atelier,
    contentHtml: atelier.content ? renderTipTapToHtml(atelier.content) : '',
    sidebarContentHtml: atelier.sidebarContent ? renderTipTapToHtml(atelier.sidebarContent) : '',
    categoryData: categoriesMap.get(atelier.category) || null,
    personsData: Array.isArray(atelier.persons)
      ? (atelier.persons as string[]).map(id => personsMap.get(id)).filter(Boolean)
      : []
  }))
})
