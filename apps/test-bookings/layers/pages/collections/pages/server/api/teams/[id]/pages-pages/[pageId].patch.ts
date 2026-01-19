// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePagesPage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { PagesPage } from '../../../../../types'

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
  const { pageId } = getRouterParams(event)
  if (!pageId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing page ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PagesPage>>(event)

  // Extract default title/slug from translations if not provided at root level
  const defaults = extractDefaultsFromTranslations(body.translations)

  return await updatePagesPage(pageId, team.id, user.id, {
    title: body.title || defaults.title,
    slug: body.slug || defaults.slug,
    pageType: body.pageType,
    content: body.content,
    config: body.config,
    status: body.status,
    visibility: body.visibility,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : body.publishedAt,
    showInNavigation: body.showInNavigation,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    translations: body.translations
  })
})