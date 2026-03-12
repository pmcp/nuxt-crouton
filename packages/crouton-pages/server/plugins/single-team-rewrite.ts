// Extend H3EventContext for single-team mode
declare module 'h3' {
  interface H3EventContext {
    /** Whether single-team mode is active */
    isSingleTeam?: boolean
    /** The team slug in single-team mode */
    singleTeamSlug?: string | null
  }
}

const SKIP_PREFIXES = [
  '/api/',
  '/api?',
  '/_nuxt/',
  '/__nuxt',
  '/auth/',
  '/admin/',
  '/super-admin/',
  '/dashboard/',
]

/**
 * Single-Team Context Plugin (Nitro Plugin)
 *
 * In single-team mode, sets context flags so useDomainContext() knows to
 * hide the team slug in URLs. Also redirects root (/) to the default locale.
 *
 * NOTE: This plugin does NOT rewrite URLs. The page component ([...slug].vue)
 * handles param remapping when Vue Router matches /nl/aanbod as team=nl.
 * Rewriting URLs here would cause SSR/client hydration mismatches because
 * the server would render with /sintlukas/nl/aanbod but the client browser
 * URL is /nl/aanbod.
 *
 * Configured via: runtimeConfig.public.croutonPages.singleTeam
 */
export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  const singleTeam = config.public?.croutonPages?.singleTeam as { slug?: string; defaultLocale?: string } | undefined

  if (!singleTeam?.slug) return

  const slug = singleTeam.slug
  const defaultLocale = singleTeam.defaultLocale || 'en'

  const originalHandler = nitroApp.h3App.handler

  nitroApp.h3App.handler = defineEventHandler(async (event) => {
    const path = event.node.req.url || '/'

    // Skip API routes, auth, admin, and internal paths
    if (SKIP_PREFIXES.some(p => path.startsWith(p))) {
      return originalHandler(event)
    }

    // Skip static files (anything with a dot in the last segment)
    const lastSegment = path.split('/').pop() || ''
    if (lastSegment.includes('.')) {
      return originalHandler(event)
    }

    // Set context flags for useDomainContext (hideTeamInUrl, isSingleTeam)
    event.context.isSingleTeam = true
    event.context.singleTeamSlug = slug

    // Root URL → redirect to default locale
    if (path === '/') {
      return sendRedirect(event, `/${defaultLocale}/`, 302)
    }

    // No URL rewrite — Vue Router + param remapping handles routing
    return originalHandler(event)
  })
})
