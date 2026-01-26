/**
 * Domain Resolution Middleware
 *
 * Resolves custom domains to team context and rewrites URLs.
 *
 * Example:
 * - Request: booking.acme.com/about
 * - Domain lookup: booking.acme.com → team "acme"
 * - Rewrite: /about → /acme/about
 * - Result: [team]/[...slug].vue handles it normally
 *
 * This middleware runs before team-context middleware (prefixed with 01-).
 */
import { eq, and } from 'drizzle-orm'
import * as authSchema from '@fyit/crouton-auth/server/database/schema/auth'

// Extend H3EventContext for domain resolution
declare module 'h3' {
  interface H3EventContext {
    /** The custom domain that was resolved (if any) */
    resolvedDomain?: string | null
    /** Team ID resolved from custom domain */
    resolvedDomainTeamId?: string | null
    /** Whether this request came from a custom domain */
    isCustomDomain?: boolean
  }
}

// Skip these hosts (not custom domains)
const SKIP_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0'
]

// Skip these paths (API routes, auth, etc.)
const SKIP_PATH_PREFIXES = [
  '/api/',
  '/_nuxt/',
  '/__nuxt',
  '/auth/',
  '/admin/'
]

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)

  // Skip API routes and internal paths
  if (SKIP_PATH_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return
  }

  // Get the request host
  const host = getRequestHost(event, { xForwardedHost: true })

  if (!host) {
    return
  }

  // Skip localhost and IP addresses
  const hostname = host.split(':')[0] // Remove port if present
  if (!hostname || SKIP_HOSTS.includes(hostname)) {
    return
  }

  // Skip if path already has a team segment (e.g., /acme/about)
  // Team slugs typically don't start with underscore or have dots
  const pathSegments = path.split('/').filter(Boolean)
  if (pathSegments.length >= 1) {
    const firstSegment = pathSegments[0]
    // If first segment looks like a team slug (not a file), skip
    // Team slugs are typically alphanumeric with dashes
    if (firstSegment && /^[a-z0-9][a-z0-9-]*$/i.test(firstSegment) && !firstSegment.includes('.')) {
      // Could be a team slug already, let normal routing handle it
      return
    }
  }

  // Skip common app domains (configure via runtime config)
  const config = useRuntimeConfig()
  const appDomains = (config.public?.croutonPages?.appDomains as string[] | undefined) || []

  // Also skip if host matches the app's primary domain
  if (appDomains.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
    return
  }

  // Look up the domain in the database
  try {
    // Use Drizzle to query the domain table
    // useDB() is the NuxtHub auto-import for database access
    const database = useDB()

    const domainRecord = await database
      .select({
        domain: authSchema.domain.domain,
        organizationId: authSchema.domain.organizationId,
        status: authSchema.domain.status
      })
      .from(authSchema.domain)
      .where(
        and(
          eq(authSchema.domain.domain, hostname),
          eq(authSchema.domain.status, 'verified')
        )
      )
      .limit(1)
      .then((rows: Array<{ domain: string; organizationId: string; status: string }>) => rows[0])

    if (!domainRecord) {
      // Domain not found or not verified
      return
    }

    // Get the organization slug for URL rewriting
    const orgRecord = await database
      .select({
        slug: authSchema.organization.slug
      })
      .from(authSchema.organization)
      .where(eq(authSchema.organization.id, domainRecord.organizationId))
      .limit(1)
      .then((rows: Array<{ slug: string }>) => rows[0])

    if (!orgRecord) {
      // Organization not found
      return
    }

    // Store in context for other middleware/pages to use
    event.context.resolvedDomain = hostname
    event.context.resolvedDomainTeamId = domainRecord.organizationId
    event.context.isCustomDomain = true

    // Rewrite the URL to include the team slug
    // /about → /acme/about
    const newPath = `/${orgRecord.slug}${path === '/' ? '' : path}`

    // Use Nitro's internal rewrite by modifying the event path
    // This allows the router to pick up the rewritten path
    event.node.req.url = newPath
    event._path = newPath

    // Debug logging
    if (config.public?.croutonPages?.debug) {
      console.log(`[crouton-pages] Domain resolved: ${hostname} → team ${orgRecord.slug}, path ${path} → ${newPath}`)
    }
  } catch (error) {
    // Don't fail the request, just skip domain resolution
    console.error('[crouton-pages] Domain resolution error:', error)
  }
})
