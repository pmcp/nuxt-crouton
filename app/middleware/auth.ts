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
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public.crouton?.auth
  const redirects = config?.ui?.redirects

  // TODO: Phase 4 - Implement actual auth check
  // const { loggedIn } = useAuth()
  // if (!loggedIn.value) {
  //   return navigateTo(redirects?.unauthenticated ?? '/auth/login')
  // }

  // Placeholder: allow all for now
  console.log('[@crouton/auth] Auth middleware: route', to.path)
})
