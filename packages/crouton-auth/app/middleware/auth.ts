/**
 * Auth Middleware
 *
 * Protects routes that require authentication.
 * Redirects unauthenticated users to the login page.
 *
 * @example
 * ```vue
 * <script setup>
 * definePageMeta({
 *   middleware: 'auth'
 * })
 * </script>
 * ```
 */
import type { CroutonAuthConfig } from '../../types/config'

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const redirects = config?.ui?.redirects

  // Skip on server - let server-side auth middleware handle it
  if (import.meta.server) return

  const { isAuthenticated, isPending } = useSession()

  // Wait for session to load if pending
  if (isPending.value) {
    // Give it a moment to resolve
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Check authentication
  if (!isAuthenticated.value) {
    // Store intended destination for redirect after login
    const redirectPath = to.fullPath
    const loginPath = redirects?.unauthenticated ?? '/auth/login'

    if (config?.debug) {
      console.log(`[@crouton/auth] Auth middleware: redirecting to ${loginPath} (from ${redirectPath})`)
    }

    // Redirect to login with return URL
    return navigateTo({
      path: loginPath,
      query: { redirect: redirectPath },
    })
  }

  if (config?.debug) {
    console.log(`[@crouton/auth] Auth middleware: authenticated, proceeding to ${to.path}`)
  }
})
