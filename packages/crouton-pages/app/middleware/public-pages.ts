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

  if (RESERVED_PREFIXES.includes(firstSegment)) {
    // For reserved prefixes, abort with 404
    // This prevents the page component from even trying to render
    throw createError({
      status: 404,
      statusText: 'Page Not Found'
    })
  }
})
