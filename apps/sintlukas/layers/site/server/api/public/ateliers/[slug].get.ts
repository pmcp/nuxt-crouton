import { eq, and, inArray } from 'drizzle-orm'
import { contentAteliers, contentCategories, contentPersons, organization } from '~~/server/db/schema'

const TEAM_SLUG = 'sintlukas'

/**
 * Strip broken shortcode remnants from rendered HTML.
 * The seed script's regex failed on `:dispatch{:data='{"download":["..."]}' type='downloads'}`
 * because of nested braces, leaving `' type='downloads'}` or `' type='Link'}` in the text.
 * Also removes empty `<p>` tags left behind after stripping.
 */
function cleanShortcodeRemnants(html: string): string {
  return html
    .replace(/&#39;\s*type=&#39;(?:downloads|Link)&#39;\}/g, '')
    .replace(/'\s*type='(?:downloads|Link)'\}/g, '')
    .replace(/<p>\s*&nbsp;\s*<\/p>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ status: 400, statusText: 'Missing slug' })
  }

  const db = useDB()

  const [team] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, TEAM_SLUG))
    .limit(1)

  if (!team) {
    throw createError({ status: 500, statusText: 'Team not found' })
  }

  // Find atelier by title slug (lowercase, hyphenated)
  const ateliers = await db
    .select()
    .from(contentAteliers)
    .where(and(
      eq(contentAteliers.teamId, team.id),
      eq(contentAteliers.status, 'published')
    ))

  const atelier = ateliers.find((a: any) => slugify(a.title) === slug)

  if (!atelier) {
    throw createError({ status: 404, statusText: 'Atelier not found' })
  }

  // Resolve persons
  let personsData: any[] = []
  if (Array.isArray(atelier.persons) && (atelier.persons as string[]).length > 0) {
    const personRecords = await db
      .select()
      .from(contentPersons)
      .where(inArray(contentPersons.id, atelier.persons as string[]))
    personsData = personRecords
  }

  // Resolve category
  let categoryData = null
  if (atelier.category) {
    const [cat] = await db
      .select()
      .from(contentCategories)
      .where(eq(contentCategories.id, atelier.category))
      .limit(1)
    categoryData = cat || null
  }

  return {
    ...atelier,
    contentHtml: atelier.content ? cleanShortcodeRemnants(renderTipTapToHtml(atelier.content)) : '',
    sidebarContentHtml: atelier.sidebarContent ? cleanShortcodeRemnants(renderTipTapToHtml(atelier.sidebarContent)) : '',
    categoryData,
    personsData
  }
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
