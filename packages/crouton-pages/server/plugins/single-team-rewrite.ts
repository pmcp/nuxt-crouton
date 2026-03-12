// Extend H3EventContext for routing mode
declare module 'h3' {
  interface H3EventContext {
    /** The crouton-pages routing mode */
    routingMode?: 'team' | 'locale'
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
 * Routing Mode Context Plugin (Nitro Plugin)
 *
 * In locale mode, sets context flags so useDomainContext() knows to
 * hide the team slug in URLs. Also redirects root (/) to the default locale.
 *
 * In team mode (default), this plugin is a no-op.
 *
 * Configured via: runtimeConfig.public.croutonPages.routingMode
 */
export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  const pagesConfig = config.public?.croutonPages as { routingMode?: string; defaultLocale?: string } | undefined
  const routingMode = pagesConfig?.routingMode || 'team'

  if (routingMode !== 'locale') return

  const defaultLocale = pagesConfig?.defaultLocale || 'en'

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

    // Set routing mode context for useDomainContext (hideTeamInUrl)
    event.context.routingMode = 'locale'

    // Root URL → redirect to default locale
    if (path === '/') {
      return sendRedirect(event, `/${defaultLocale}/`, 302)
    }

    return originalHandler(event)
  })
})
