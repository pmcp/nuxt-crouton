/// <reference path="../../../../crouton-hooks.d.ts" />
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

  // Split into nested path segments. Pages are addressed hierarchically
  // (/{parent}/{child}); a collection-binder item is the special case where the
  // last segment isn't itself a page slug (see lookup below). Slugs are unique
  // per team, so the last segment alone identifies the page; the preceding
  // segments must match its ancestor chain for the URL to be canonical.
  const slugParts = rawSlug ? rawSlug.split('/').filter(Boolean) : []
  // Resolved during lookup — non-null only for binder sub-routes.
  let binderItemId: string | null = null

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
      const { sql } = await import('drizzle-orm')

      // Localized slug for a page row: translated slug for the locale, else base.
      const rowLocalizedSlug = (row: any): string => {
        if (!row?.translations) return row?.slug || ''
        try {
          const tr = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations
          return tr?.[locale]?.slug || row.slug || ''
        } catch {
          return row?.slug || ''
        }
      }

      // Find a page by its slug for this team, matching base slug OR the
      // translated slug for the current locale.
      const findPageBySlug = async (slugValue: string): Promise<any> => {
        const byBase = await database
          .select()
          .from(pagesSchema.pagesPages as any)
          .where(
            and(
              eq(pagesSchema.pagesPages.teamId as any, team.id),
              eq(pagesSchema.pagesPages.slug as any, slugValue)
            )
          )
          .limit(1)
          .then((rows: any[]) => rows[0])
        if (byBase) return byBase
        return database
          .select()
          .from(pagesSchema.pagesPages as any)
          .where(
            and(
              eq(pagesSchema.pagesPages.teamId as any, team.id),
              sql`json_extract(${pagesSchema.pagesPages.translations as any}, '$.' || ${locale} || '.slug') = ${slugValue}`
            )
          )
          .limit(1)
          .then((rows: any[]) => rows[0])
      }

      // Walk a page's parentId chain, returning ancestor localized slugs
      // ordered root → parent (excluding the page itself).
      const resolveAncestorSlugs = async (startPage: any): Promise<string[]> => {
        const slugs: string[] = []
        const seen = new Set<string>([startPage.id])
        let parentId: string | null = startPage.parentId || null
        while (parentId && !seen.has(parentId)) {
          seen.add(parentId)
          const parent = await database
            .select()
            .from(pagesSchema.pagesPages as any)
            .where(
              and(
                eq(pagesSchema.pagesPages.teamId as any, team.id),
                eq(pagesSchema.pagesPages.id as any, parentId)
              )
            )
            .limit(1)
            .then((rows: any[]) => rows[0])
          if (!parent) break
          const s = rowLocalizedSlug(parent)
          if (s) slugs.unshift(s)
          parentId = parent.parentId || null
        }
        return slugs
      }

      let page: any
      // The canonical nested slug path of the resolved page (localized),
      // e.g. "events/summer-fair". Empty for the homepage. Returned for SEO.
      let fullPath = ''
      const slug = slugParts[0] || ''

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
        const lastSeg = slugParts[slugParts.length - 1]!

        // 1) Treat the last segment as a page slug (unique per team).
        page = await findPageBySlug(lastSeg)

        if (page) {
          // Nested page: its ancestor slug chain must match the URL prefix,
          // otherwise the URL is non-canonical → 404.
          const ancestorSlugs = await resolveAncestorSlugs(page)
          const prefix = slugParts.slice(0, -1)
          if (ancestorSlugs.join('/') !== prefix.join('/')) {
            throw createError({ status: 404, statusText: 'Page not found' })
          }
          fullPath = [...ancestorSlugs, rowLocalizedSlug(page)].filter(Boolean).join('/')
        } else if (slugParts.length >= 2) {
          // 2) Collection-binder sub-route: the segment before the last is the
          // binder page, the last segment is the item id.
          const binderSlug = slugParts[slugParts.length - 2]!
          page = await findPageBySlug(binderSlug)

          if (!page || page.pageType !== 'pages:collection-binder') {
            throw createError({ status: 404, statusText: 'Page not found' })
          }

          // Binder's own ancestry must match the segments before it.
          const ancestorSlugs = await resolveAncestorSlugs(page)
          const prefix = slugParts.slice(0, -2)
          if (ancestorSlugs.join('/') !== prefix.join('/')) {
            throw createError({ status: 404, statusText: 'Page not found' })
          }

          binderItemId = lastSeg
          fullPath = [...ancestorSlugs, rowLocalizedSlug(page)].filter(Boolean).join('/')
        } else {
          throw createError({ status: 404, statusText: 'Page not found' })
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
      } else if (page.visibility === 'scoped') {
        // Scoped pages: a valid scoped-access token for this team unlocks the
        // page (volunteers/guests — see crouton-auth grants). Team members
        // pass too, so admins can preview. The page's config may narrow the
        // required token via { requiredScope: { resourceType, resourceId? } } —
        // compared as plain strings, pages never learns what the resource is.
        let allowed = false

        let requiredScope: { resourceType?: string, resourceId?: string, nameRequired?: boolean } | null = null
        // Per-page chrome flags, echoed in the 401 payload so the access gate
        // renders with the same (hidden) chrome as the unlocked page.
        let chrome: { hideNav?: boolean, hideAuthControls?: boolean } | undefined
        try {
          const config = typeof page.config === 'string' ? JSON.parse(page.config) : page.config
          requiredScope = config?.requiredScope || null
          if (config?.hideNav || config?.hideAuthControls) {
            chrome = { hideNav: !!config.hideNav, hideAuthControls: !!config.hideAuthControls }
          }
        } catch {
          // Malformed config — treat as no scope restriction
        }

        // Derive the scope from the page's content blocks at read time
        // (crouton:pages:derive-scope — e.g. crouton-sales answers
        // ('event', eventId) for an embedded eventWorkspaceBlock, so the gate
        // redeems the event's helper PIN directly). The blocks are the source
        // of truth — nothing is stored, so there's no state to drift. A
        // derived scope outranks config.requiredScope; no answer (block
        // removed, event deleted, slug unresolvable) falls back to the
        // stored scope, then to the page's own ('page', pageId) gate.
        const docBlocks = (raw: unknown): Array<{ type?: string, attrs?: Record<string, unknown> }> => {
          try {
            const doc = typeof raw === 'string' ? JSON.parse(raw) : raw
            return Array.isArray((doc as any)?.content) ? (doc as any).content : []
          } catch {
            return []
          }
        }
        let blocks = docBlocks(page.content)
        if (!blocks.length && page.translations) {
          // Block content may live only in the translations (localized
          // editor) — any locale will do, the embedded blocks are identical.
          try {
            const tr = typeof page.translations === 'string' ? JSON.parse(page.translations) : page.translations
            for (const localeData of Object.values(tr || {})) {
              blocks = docBlocks((localeData as any)?.content)
              if (blocks.length) break
            }
          } catch {
            // Malformed translations — no blocks to derive from
          }
        }

        if (blocks.length) {
          try {
            const derivePayload = { teamId: team.id, blocks, result: null as { resourceType: string, resourceId: string, nameRequired?: boolean } | null }
            await useNitroApp().hooks.callHook('crouton:pages:derive-scope', derivePayload)
            if (derivePayload.result) {
              requiredScope = derivePayload.result
            }
          } catch (err) {
            console.error('[crouton-pages] derive-scope hook failed:', err)
          }
        }

        try {
          const { validateScopedTokenFromEvent } = await import('@fyit/crouton-auth/server/utils/scoped-access')
          const access = await validateScopedTokenFromEvent(event)

          if (access && access.organizationId === team.id) {
            allowed = !requiredScope
              || ((!requiredScope.resourceType || access.resourceType === requiredScope.resourceType)
                && (!requiredScope.resourceId || access.resourceId === requiredScope.resourceId))
          }

          if (!allowed) {
            // Fall back to a team-member session (admin preview)
            const { getServerSession } = await import('@fyit/crouton-auth/server/utils/useServerAuth')
            const session = await getServerSession(event)
            if (session?.user) {
              const membership = await database
                .select({ id: authSchema.member.id as any })
                .from(authSchema.member as any)
                .where(
                  and(
                    eq(authSchema.member.userId as any, session.user.id),
                    eq(authSchema.member.organizationId as any, team.id)
                  )
                )
                .limit(1)
                .then((rows: any[]) => rows[0])
              allowed = !!membership
            }
          }
        } catch {
          allowed = false
        }

        if (!allowed) {
          // The data payload lets the client render a PIN gate instead of the
          // member login: it says which resource a credential must be redeemed
          // against — the page's requiredScope, or the page itself (so a grant
          // on ('page', pageId) makes the page self-service PIN-protectable).
          throw createError({
            status: 401,
            statusText: 'Access token required',
            data: {
              reason: 'scoped',
              teamId: team.id,
              scope: requiredScope ?? { resourceType: 'page', resourceId: page.id },
              ...(chrome ? { chrome } : {})
            }
          })
        }

        // Prevent ISR/SWR from caching token-gated page responses
        setResponseHeader(event, 'Cache-Control', 'private, no-store')
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
          // Canonical nested slug path (localized), e.g. "events/summer-fair".
          // Empty for the homepage. Consumers build the URL as
          // /{team?}/{locale}/{fullPath}.
          fullPath,
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
