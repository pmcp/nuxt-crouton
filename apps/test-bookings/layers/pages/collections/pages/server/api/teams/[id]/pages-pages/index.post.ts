// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createPagesPage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

/**
 * Extract default title/slug from translations object
 * Falls back to 'en' locale first, then first available locale
 */
function extractDefaultsFromTranslations(translations: Record<string, { title?: string; slug?: string }> | undefined) {
  if (!translations) return { title: undefined, slug: undefined }

  // Try 'en' first (default locale), then first available locale
  const defaultLocale = translations.en || Object.values(translations)[0]

  if (!defaultLocale) return { title: undefined, slug: undefined }

  return {
    title: defaultLocale.title,
    slug: defaultLocale.slug
  }
}

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Exclude id field to let the database generate it
  const { id, ...dataWithoutId } = body

  // Convert date string to Date object
  if (dataWithoutId.publishedAt) {
    dataWithoutId.publishedAt = new Date(dataWithoutId.publishedAt)
  }

  // Extract default title/slug from translations if not provided at root level
  const defaults = extractDefaultsFromTranslations(dataWithoutId.translations)

  const title = dataWithoutId.title || defaults.title
  const slug = dataWithoutId.slug || defaults.slug

  // Validate required fields
  if (!title || (typeof title === 'string' && title.trim() === '')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required. Please provide a title in at least one language.'
    })
  }

  // Auto-generate slug from title if not provided
  const finalSlug = slug || title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')

  return await createPagesPage({
    ...dataWithoutId,
    title,
    slug: finalSlug,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
})