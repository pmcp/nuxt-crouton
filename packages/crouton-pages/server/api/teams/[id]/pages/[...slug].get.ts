/**
 * Get Single Page by Slug (Catch-All)
 *
 * Returns a single page for public rendering.
 * Handles single-segment slugs (regular pages) and multi-segment slugs
 * for collection binder sub-routes (e.g. /locations/abc123).
 *
 * Single-segment: finds page directly by slug.
 * Two-segment: finds the binder page by first segment, injects second segment
 * as `config.binderItemId` for the CollectionBinderRenderer to use.
 *
 * GET /api/teams/[id]/pages/[...slug]
 */
import { eq, and, or, asc } from 'drizzle-orm'

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
  const rawSlug = (!slugParam || slugParam === '_home') ? '' : slugParam

  // Split into parts — detect binder sub-routes
  const slugParts = rawSlug ? rawSlug.split('/').filter(Boolean) : []
  const slug = slugParts[0] || ''
  const binderItemId = slugParts.length === 2 ? slugParts[1] : null

  // Get locale from query parameter (for translated slug lookup)
  const locale = getQuery(event).locale as string || 'en'

  try {
    const database = useDB()

    // Resolve team
    const authSchema = await import('@fyit/crouton-auth/server/database/schema/auth')

    const team = await database
      .select({ id: authSchema.organization.id as any, slug: authSchema.organization.slug as any })
      .from(authSchema.organization as any)
      .where(
        or(
          eq(authSchema.organization.id as any, teamParam),
          eq(authSchema.organization.slug as any, teamParam)
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
          .from(pagesSchema.pagesPages as any)
          .where(
            and(
              eq(pagesSchema.pagesPages.teamId as any, team.id),
              eq(pagesSchema.pagesPages.status as any, 'published'),
              eq(pagesSchema.pagesPages.depth as any, 0) // Root level only
            )
          )
          .orderBy(asc(pagesSchema.pagesPages.order as any))
          .limit(1)
          .then((rows: any[]) => rows[0])

        if (!page) {
          throw createError({
            status: 404,
            statusText: 'No published homepage found'
          })
        }
      } else {
        // Find page by slug (first segment)
        page = await database
          .select()
          .from(pagesSchema.pagesPages as any)
          .where(
            and(
              eq(pagesSchema.pagesPages.teamId as any, team.id),
              eq(pagesSchema.pagesPages.slug as any, slug)
            )
          )
          .limit(1)
          .then((rows: any[]) => rows[0])

        // If not found by base slug, search in translations JSON
        if (!page) {
          const { sql } = await import('drizzle-orm')
          page = await database
            .select()
            .from(pagesSchema.pagesPages as any)
            .where(
              and(
                eq(pagesSchema.pagesPages.teamId as any, team.id),
                sql`json_extract(${pagesSchema.pagesPages.translations as any}, '$.' || ${locale} || '.slug') = ${slug}`
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

        // For multi-segment slugs, verify the page is a collection binder
        if (binderItemId && page.pageType !== 'pages:collection-binder') {
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
      } else if (page.visibility === 'members' || page.visibility === 'admin') {
        // Members/admin-only pages require authentication
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
            .select({ id: authSchema.member.id as any, role: authSchema.member.role as any })
            .from(authSchema.member as any)
            .where(
              and(
                eq(authSchema.member.userId as any, session.user.id),
                eq(authSchema.member.organizationId as any, team.id)
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

          // Admin-only pages require admin or owner role
          if (page.visibility === 'admin' && membership.role !== 'admin' && membership.role !== 'owner') {
            throw createError({
              status: 403,
              statusText: 'Access denied - admin access required'
            })
          }

          // Prevent ISR/SWR from caching restricted page responses
          setResponseHeader(event, 'Cache-Control', 'private, no-store')
        } catch (authError: any) {
          if (authError.statusCode) throw authError
          throw createError({
            status: 401,
            statusText: 'Authentication required'
          })
        }
      }

      // Resolve translations - merge translated fields over base values
      if (page.translations) {
        try {
          const translations = typeof page.translations === 'string'
            ? JSON.parse(page.translations)
            : page.translations

          const localeTranslations = translations[locale] || translations['en'] || Object.values(translations)[0]

          if (localeTranslations && typeof localeTranslations === 'object') {
            const originalSlug = page.slug
            for (const [key, value] of Object.entries(localeTranslations)) {
              if (value !== null && value !== undefined) {
                page[key] = value
              }
            }
            page.baseSlug = originalSlug
          }
        } catch (e) {
          console.error('[pages] Translation parsing error:', e)
        }
      }

      // For binder sub-routes: inject binderItemId into config
      if (binderItemId) {
        const existingConfig = page.config
          ? (typeof page.config === 'string' ? JSON.parse(page.config) : page.config)
          : {}
        page.config = { ...existingConfig, binderItemId }
      }

      return {
        data: page,
        meta: {
          teamId: team.id,
          teamSlug: team.slug,
          locale,
          translations: page.translations
        }
      }
    } catch (error: any) {
      if (error.statusCode) throw error
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
