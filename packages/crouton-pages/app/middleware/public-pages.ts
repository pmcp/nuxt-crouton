/**
 * Public Pages Middleware
 *
 * Prevents the [team]/[locale]/[...slug] routes from handling reserved prefixes.
 * This middleware runs BEFORE the page component, avoiding SSR template issues.
 */
export default defineNuxtRouteMiddleware((to) => {
  // Only apply to routes that look like team/locale/slug patterns
  const pathSegments = to.path.split('/').filter(Boolean)

  if (pathSegments.length === 0) {
    return // Root path, not relevant
  }

  const firstSegment = pathSegments[0]

  // Reserved prefixes that should NOT be treated as team slugs
  // These routes are handled by other packages (auth, admin, etc.)
  // Note: 'api' is NOT included because API routes are handled by Nitro server routes,
  // they never reach this route middleware
  const reservedPrefixes = ['auth', 'admin', 'dashboard', '_nuxt', '__nuxt']

  if (reservedPrefixes.includes(firstSegment)) {
    // For reserved prefixes, abort with 404
    // This prevents the page component from even trying to render
    throw createError({
      status: 404,
      statusText: 'Page Not Found'
    })
  }
})
