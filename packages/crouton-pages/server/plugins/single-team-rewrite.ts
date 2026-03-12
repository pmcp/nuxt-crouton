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
 * Single-Team URL Rewriter (Nitro Plugin)
 *
 * Wraps h3's app handler to modify event.node.req.url BEFORE h3 computes
 * _reqPath in createAppEventHandler. This is necessary because h3 resets
 * event._path and event.node.req.url from the original _reqPath on every
 * handler iteration, so server middleware modifications are lost.
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

    // Skip if path already includes the team slug
    if (path === `/${slug}` || path.startsWith(`/${slug}/`) || path.startsWith(`/${slug}?`)) {
      event.context.isSingleTeam = true
      event.context.singleTeamSlug = slug
      return originalHandler(event)
    }

    // Skip API routes, auth, admin, and internal paths
    if (SKIP_PREFIXES.some(p => path.startsWith(p))) {
      return originalHandler(event)
    }

    // Skip static files (anything with a dot in the last segment)
    const lastSegment = path.split('/').pop() || ''
    if (lastSegment.includes('.')) {
      return originalHandler(event)
    }

    // Set context flags for useDomainContext
    event.context.isSingleTeam = true
    event.context.singleTeamSlug = slug

    // Root URL → redirect to default locale
    if (path === '/') {
      return sendRedirect(event, `/${defaultLocale}/`, 302)
    }

    // Rewrite URL before h3 processes it
    // event._path is undefined at this point, so h3 will read from event.node.req.url
    event.node.req.url = `/${slug}${path}`

    if (config.public?.croutonPages?.debug) {
      console.log(`[crouton-pages] Single-team rewrite: ${path} → ${event.node.req.url}`)
    }

    return originalHandler(event)
  })
})
