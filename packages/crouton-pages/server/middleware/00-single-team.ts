// Extend H3EventContext for single-team mode
declare module 'h3' {
  interface H3EventContext {
    /** Whether single-team mode is active */
    isSingleTeam?: boolean
    /** The team slug in single-team mode */
    singleTeamSlug?: string | null
  }
}

/**
 * Single-Team URL Rewriter
 *
 * For single-team sites, rewrites public URLs to include the team slug
 * so the crouton-pages router can handle them. Configured via:
 *
 * runtimeConfig.public.croutonPages.singleTeam: { slug: 'myteam', defaultLocale: 'nl' }
 *
 * When enabled:
 * - / → 302 redirect to /{slug}/{defaultLocale}/
 * - /nl/about → internal rewrite to /{slug}/nl/about
 * - Skips /api/, /_nuxt/, /auth/, /admin/, /super-admin/, /dashboard/ and static files
 * - Sets event.context flags so useDomainContext().hideTeamInUrl returns true
 */

const SKIP_PREFIXES = [
  '/api/',
  '/api?',
  '/_nuxt/',
  '/__nuxt',
  '/auth/',
  '/admin/',
  '/super-admin/',
  '/dashboard/'
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const singleTeam = config.public?.croutonPages?.singleTeam as { slug?: string; defaultLocale?: string } | undefined

  // Disabled if no slug configured
  if (!singleTeam?.slug) return

  const slug = singleTeam.slug
  const defaultLocale = singleTeam.defaultLocale || 'en'
  const path = getRequestPath(event)

  // Skip if path already includes the team slug
  if (path === `/${slug}` || path.startsWith(`/${slug}/`) || path.startsWith(`/${slug}?`)) {
    // Still set context flags so hideTeamInUrl works on rewritten paths
    event.context.isSingleTeam = true
    event.context.singleTeamSlug = slug
    return
  }

  // Skip API routes, auth, admin, and internal paths
  if (SKIP_PREFIXES.some(p => path.startsWith(p))) return

  // Skip static files (anything with a dot in the last segment)
  const lastSegment = path.split('/').pop() || ''
  if (lastSegment.includes('.')) return

  // Set context flags for useDomainContext
  event.context.isSingleTeam = true
  event.context.singleTeamSlug = slug

  // For root URL, redirect to the default locale homepage
  // Redirect to /{locale}/ (without slug) — the next request will be rewritten internally
  if (path === '/') {
    return sendRedirect(event, `/${defaultLocale}/`, 302)
  }

  // For other paths (e.g., /nl/about), rewrite internally to /{slug}/nl/about
  const newPath = `/${slug}${path}`
  event.node.req.url = newPath
  event._path = newPath

  if (config.public?.croutonPages?.debug) {
    console.log(`[crouton-pages] Single-team rewrite: ${path} → ${newPath}`)
  }
})