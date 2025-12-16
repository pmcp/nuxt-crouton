/**
 * Team Context Middleware
 *
 * Automatically resolves and syncs team context based on auth mode.
 * This middleware should be applied to dashboard routes that need team context.
 *
 * Behavior by mode:
 * - Multi-tenant: Validates team in URL, redirects if invalid, syncs with session
 * - Single-tenant: Uses default team from config
 * - Personal: Uses user's personal workspace from session
 *
 * @example
 * ```typescript
 * // In pages/dashboard/[team]/[...all].vue
 * definePageMeta({
 *   middleware: 'team-context'
 * })
 * ```
 */
import type { CroutonAuthConfig } from '../../types/config'

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined

  // Only run in browser (SSR handled by server)
  if (import.meta.server) return

  // Skip for auth routes
  if (to.path.startsWith('/auth')) return

  // Skip if not a dashboard route
  if (!to.path.startsWith('/dashboard')) return

  // Debug logging
  if (config?.debug) {
    console.log(`[@crouton/auth] Team context middleware: ${to.path}`)
  }

  try {
    const { resolveTeamFromRoute } = useTeamContext()
    const resolution = await resolveTeamFromRoute()

    // Handle redirects
    if (resolution.needsRedirect && resolution.redirectTo) {
      if (config?.debug) {
        console.log(`[@crouton/auth] Redirecting to: ${resolution.redirectTo}`)
      }
      return navigateTo(resolution.redirectTo, { replace: true })
    }

    // No team and authenticated - might need to create one or redirect
    if (!resolution.teamId) {
      const { isAuthenticated } = useSession()
      if (isAuthenticated.value) {
        // User has no teams - might want to redirect to team creation
        // For now, just log
        if (config?.debug) {
          console.log('[@crouton/auth] No team context available for authenticated user')
        }
      }
    }
  }
  catch (error) {
    console.error('[@crouton/auth] Team context middleware error:', error)
    // Don't block navigation on error - let the page handle it
  }
})
