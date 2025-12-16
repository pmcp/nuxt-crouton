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
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public.crouton?.auth
  const redirects = config?.ui?.redirects

  // TODO: Phase 4 - Implement actual auth check
  // const { loggedIn } = useAuth()
  // if (loggedIn.value) {
  //   return navigateTo(redirects?.authenticated ?? '/dashboard')
  // }

  // Placeholder: allow all for now
  console.log('[@crouton/auth] Guest middleware: route', to.path)
})
