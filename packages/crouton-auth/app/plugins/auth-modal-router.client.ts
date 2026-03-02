/**
 * Auth Modal Router Plugin
 *
 * Intercepts client-side navigations to /auth/* routes and shows them
 * as a UModal overlay instead of performing a full page transition.
 * The URL is still updated via history.pushState for deep-linking.
 *
 * Fresh page loads (from.matched.length === 0) are NOT intercepted
 * so direct URL entry and email links continue to use the full auth layout.
 */
import type { AuthModalMode } from '../composables/useAuthModal'

const AUTH_PATHS: Record<string, AuthModalMode> = {
  '/auth/login': 'login',
  '/auth/register': 'register',
  '/auth/forgot-password': 'forgot-password'
}

export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.beforeEach((to, from) => {
    const mode = AUTH_PATHS[to.path]

    // Only intercept in-app navigations (from.matched.length === 0 = fresh page load)
    if (!mode || from.matched.length === 0) {
      return
    }

    const redirectTo = (to.query.redirect as string) || '/'
    const prefillEmail = (to.query.email as string) || undefined

    // Update visible URL without triggering navigation
    window.history.pushState(null, '', to.fullPath)

    // Open the auth modal
    useAuthModal().open(mode, redirectTo, from.fullPath, prefillEmail)

    // Cancel the router navigation
    return false
  })
})
