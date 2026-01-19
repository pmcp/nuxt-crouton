/**
 * Dashboard to Pages Redirect Middleware (Optional)
 *
 * Redirects old dashboard URLs to the new pages-based system.
 * Enable by setting `croutonPages.redirectDashboard: true` in runtime config.
 *
 * Redirects:
 * - /dashboard/[team] → /[team]
 * - /dashboard/[team]/bookings → /[team]/my-bookings (if page exists)
 *
 * Does NOT redirect:
 * - /dashboard/[team]/settings/* (user settings are still valid)
 * - /admin/* (admin routes are separate)
 *
 * @deprecated Dashboard routes are deprecated in favor of pages-based navigation.
 */
export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()

  // Only active if explicitly enabled
  if (!config.public?.croutonPages?.redirectDashboard) {
    return
  }

  const path = to.path

  // Check if this is a dashboard route
  if (!path.startsWith('/dashboard/')) {
    return
  }

  // Extract team from path: /dashboard/[team]/...
  const match = path.match(/^\/dashboard\/([^/]+)(.*)$/)

  if (!match) {
    return
  }

  const team = match[1]
  const rest = match[2] || ''

  // Don't redirect settings pages - they stay as user settings
  if (rest.startsWith('/settings')) {
    return
  }

  // Redirect patterns
  const redirectMap: Record<string, string> = {
    '': '', // /dashboard/[team] → /[team]
    '/bookings': '/my-bookings' // /dashboard/[team]/bookings → /[team]/my-bookings
  }

  // Check if we have a redirect for this path
  if (rest in redirectMap) {
    const newPath = `/${team}${redirectMap[rest]}`
    console.log(`🍞 crouton:pages → ${newPath}`)
    return navigateTo(newPath, { redirectCode: 301 })
  }

  // For other dashboard routes, redirect to team homepage
  // The admin should handle collection management at /admin/[team]/...
  return navigateTo(`/${team}`, { redirectCode: 302 })
})
