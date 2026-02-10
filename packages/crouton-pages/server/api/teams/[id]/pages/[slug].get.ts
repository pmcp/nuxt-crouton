/**
 * Get Single Page by Slug
 *
 * Returns a single page for public rendering.
 * Handles visibility checks (public vs members vs hidden).
 *
 * GET /api/teams/[id]/pages/[slug]
 */
import { eq, and, or, asc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const teamParam = getRouterParam(event, 'id')
  const slugParam = getRouterParam(event, 'slug')

  if (!teamParam) {
    throw createError({
      status: 400,
      statusText: 'Team ID or slug is required'
    })
  }

  // Handle empty slug or _home (homepage)
  const slug = (!slugParam || slugParam === '_home') ? '' : slugParam

  // Get locale from query parameter (for translated slug lookup)
  const locale = getQuery(event).locale as string || 'en'

  try {
    const database = useDB()

    // Resolve team
    const authSchema = await import('@fyit/crouton-auth/server/database/schema/auth')

    const team = await database
      .select({ id: authSchema.organization.id, slug: authSchema.organization.slug })
      .from(authSchema.organization)
      .where(
        or(
          eq(authSchema.organization.id, teamParam),
          eq(authSchema.organization.slug, teamParam)
        )
      )
      .limit(1)
      .then((rows: Array<{ id: string; slug: string }>) => rows[0])

    if (!team) {
      throw createError({
        status: 404,
        statusText: 'Team not found'
      })
    }

    // Try to get page from pagesPages table
    try {
      const pagesSchema = await import('~~/layers/pages/collections/pages/server/database/schema')

      let page: any

      if (!slug) {
        // Homepage: fetch first published root page by sort order
        page = await database
          .select()
          .from(pagesSchema.pagesPages)
          .where(
            and(
              eq(pagesSchema.pagesPages.teamId, team.id),
              eq(pagesSchema.pagesPages.status, 'published'),
              eq(pagesSchema.pagesPages.depth, 0) // Root level only
            )
          )
          .orderBy(asc(pagesSchema.pagesPages.order))
          .limit(1)
          .then((rows: any[]) => rows[0])

        if (!page) {
          throw createError({
            status: 404,
            statusText: 'No published homepage found'
          })
        }
      } else {
        // Regular page: find by slug
        // First try: exact match on base slug
        page = await database
          .select()
          .from(pagesSchema.pagesPages)
          .where(
            and(
              eq(pagesSchema.pagesPages.teamId, team.id),
              eq(pagesSchema.pagesPages.slug, slug)
            )
          )
          .limit(1)
          .then((rows: any[]) => rows[0])

        // Second try: search in translations JSON for locale-specific slug
        // This is needed when base slug is null but translations have the slug
        if (!page) {
          page = await database
            .select()
            .from(pagesSchema.pagesPages)
            .where(
              and(
                eq(pagesSchema.pagesPages.teamId, team.id),
                sql`json_extract(${pagesSchema.pagesPages.translations}, '$.' || ${locale} || '.slug') = ${slug}`
              )
            )
            .limit(1)
            .then((rows: any[]) => rows[0])
        }

        if (!page) {
          throw createError({
            status: 404,
            statusText: 'Page not found'
          })
        }
      }

      // Check page status
      if (page.status !== 'published') {
        throw createError({
          status: 404,
          statusText: 'Page not found'
        })
      }

      // Check visibility
      if (page.visibility === 'hidden') {
        // Hidden pages require direct link - allow access
      } else if (page.visibility === 'members') {
        // Members-only pages require authentication
        // Try to get session
        try {
          const { getServerSession } = await import('@fyit/crouton-auth/server/utils/useServerAuth')
          const session = await getServerSession(event)

          if (!session?.user) {
            throw createError({
              status: 401,
              statusText: 'Authentication required'
            })
          }

          // Check team membership
          const membership = await database
            .select({ id: authSchema.member.id })
            .from(authSchema.member)
            .where(
              and(
                eq(authSchema.member.userId, session.user.id),
                eq(authSchema.member.organizationId, team.id)
              )
            )
            .limit(1)
            .then((rows: any[]) => rows[0])

          if (!membership) {
            throw createError({
              status: 403,
              statusText: 'Access denied - not a team member'
            })
          }
        } catch (authError: any) {
          if (authError.statusCode) throw authError
          // Auth not available, deny access
          throw createError({
            status: 401,
            statusText: 'Authentication required'
          })
        }
      }
      // visibility === 'public' - allow access

      // Resolve translations - merge translated fields over base values
      if (page.translations) {
        try {
          const translations = typeof page.translations === 'string'
            ? JSON.parse(page.translations)
            : page.translations

          // Use locale from query parameter (already extracted above)
          const localeTranslations = translations[locale] || translations['en'] || Object.values(translations)[0]

          if (localeTranslations && typeof localeTranslations === 'object') {
            // Merge translated fields (title, slug, content, etc.) - but keep original slug for reference
            const originalSlug = page.slug
            for (const [key, value] of Object.entries(localeTranslations)) {
              if (value !== null && value !== undefined) {
                page[key] = value
              }
            }
            // Store original English slug for canonical URL reference
            page.baseSlug = originalSlug
          }
        } catch (e) {
          console.error('[pages] Translation parsing error:', e)
        }
      }

      return {
        data: page,
        meta: {
          teamId: team.id,
          teamSlug: team.slug,
          locale,
          // Include raw translations for hreflang generation
          translations: page.translations
        }
      }
    } catch (error: any) {
      if (error.statusCode) throw error
      // pagesPages table doesn't exist or schema import failed
      throw createError({
        status: 404,
        statusText: 'Page not found'
      })
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[crouton-pages] Error fetching page:', error)
    throw createError({
      status: 500,
      statusText: 'Failed to fetch page'
    })
  }
})
