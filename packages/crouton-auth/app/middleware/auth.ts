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
  const config = useAuthConfig()
  const redirects = config?.ui?.redirects

  const { isAuthenticated, isPending } = useSession()

  // Wait for session to fully load (watcher pattern, up to 3s)
  if (isPending.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(
        () => isPending.value,
        (pending) => {
          if (!pending) {
            unwatch()
            resolve()
          }
        },
        { immediate: true }
      )
      setTimeout(() => {
        unwatch()
        resolve()
      }, 3000)
    })
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
      query: { redirect: redirectPath }
    })
  }

  if (config?.debug) {
    console.log(`[@crouton/auth] Auth middleware: authenticated, proceeding to ${to.path}`)
  }
})
