/**
 * Get Single Page by Slug
 *
 * Returns a single page for public rendering.
 * Handles visibility checks (public vs members vs hidden).
 *
 * GET /api/teams/[id]/pages/[slug]
 */
import { eq, and, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const teamParam = getRouterParam(event, 'id')
  const slugParam = getRouterParam(event, 'slug')

  if (!teamParam) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team ID or slug is required'
    })
  }

  // Handle empty slug (homepage)
  const slug = slugParam || ''

  try {
    const database = db

    // Resolve team
    const authSchema = await import('@friendlyinternet/nuxt-crouton-auth/server/database/schema/auth')

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
        statusCode: 404,
        statusMessage: 'Team not found'
      })
    }

    // Try to get page from pagesPages table
    try {
      const pagesSchema = await import('#crouton/schema/pages')

      // Find page by slug
      const page = await database
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

      if (!page) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Page not found'
        })
      }

      // Check page status
      if (page.status !== 'published') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Page not found'
        })
      }

      // Check visibility
      if (page.visibility === 'hidden') {
        // Hidden pages require direct link - allow access
      } else if (page.visibility === 'members') {
        // Members-only pages require authentication
        // Try to get session
        try {
          const { getServerSession } = await import('@friendlyinternet/nuxt-crouton-auth/server/utils/useServerAuth')
          const session = await getServerSession(event)

          if (!session?.user) {
            throw createError({
              statusCode: 401,
              statusMessage: 'Authentication required'
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
              statusCode: 403,
              statusMessage: 'Access denied - not a team member'
            })
          }
        } catch (authError: any) {
          if (authError.statusCode) throw authError
          // Auth not available, deny access
          throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required'
          })
        }
      }
      // visibility === 'public' - allow access

      return {
        data: page,
        meta: {
          teamId: team.id,
          teamSlug: team.slug
        }
      }
    } catch (error: any) {
      if (error.statusCode) throw error
      // pagesPages table doesn't exist
      throw createError({
        statusCode: 404,
        statusMessage: 'Page not found'
      })
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[crouton-pages] Error fetching page:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch page'
    })
  }
})
