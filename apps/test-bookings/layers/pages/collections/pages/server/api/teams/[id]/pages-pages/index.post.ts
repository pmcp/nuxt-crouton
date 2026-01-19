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

  return await createPagesPage({
    ...dataWithoutId,
    title: dataWithoutId.title || defaults.title,
    slug: dataWithoutId.slug || defaults.slug,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
})