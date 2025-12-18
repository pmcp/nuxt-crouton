/**
 * Guest Middleware
 *
 * Protects routes that should only be accessible to unauthenticated users.
 * Redirects authenticated users to the dashboard.
 *
 * @example
 * ```vue
 * <script setup>
 * definePageMeta({
 *   middleware: 'guest'
 * })
 * </script>
 * ```
 */
import type { CroutonAuthConfig } from '../../types/config'

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const redirects = config?.ui?.redirects

  // Skip on server
  if (import.meta.server) return

  const { isAuthenticated, isPending } = useSession()

  // Wait for session to load if pending
  if (isPending.value) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Redirect authenticated users away from guest-only pages
  if (isAuthenticated.value) {
    // Check for redirect query param (e.g., from login page)
    const redirectQuery = to.query.redirect as string | undefined
    const defaultRedirect = redirects?.authenticated ?? '/dashboard'

    const redirectPath = redirectQuery || defaultRedirect

    if (config?.debug) {
      console.log(`[@crouton/auth] Guest middleware: authenticated, redirecting to ${redirectPath}`)
    }

    return navigateTo(redirectPath)
  }

  if (config?.debug) {
    console.log(`[@crouton/auth] Guest middleware: not authenticated, proceeding to ${to.path}`)
  }
})
