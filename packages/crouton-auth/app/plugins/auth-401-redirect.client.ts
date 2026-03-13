/**
 * Auth 401 Redirect Plugin
 *
 * Intercepts 401 responses globally and redirects unauthenticated users
 * to the login page instead of showing console errors.
 *
 * Skips auth endpoints to avoid redirect loops.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const authConfig = config.public.crouton?.auth as { debug?: boolean; ui?: { redirects?: { unauthenticated?: string } } } | undefined
  const loginPath = authConfig?.ui?.redirects?.unauthenticated ?? '/auth/login'
  const debug = authConfig?.debug ?? false

  // Track if we're already redirecting to avoid multiple concurrent redirects
  let isRedirecting = false

  // Override globalThis.$fetch with an intercepted version
  const originalFetch = globalThis.$fetch

  globalThis.$fetch = originalFetch.create({
    onResponseError({ response, request }) {
      if (response.status !== 401) return
      if (isRedirecting) return

      const url = typeof request === 'string' ? request : request.url
      // Skip auth endpoints to avoid redirect loops
      if (url.includes('/api/auth/')) return

      if (debug) {
        console.log(`[@crouton/auth] 401 intercepted on ${url}, redirecting to login`)
      }

      isRedirecting = true
      const currentPath = window.location.pathname + window.location.search

      navigateTo({
        path: loginPath,
        query: { redirect: currentPath },
      }).finally(() => {
        setTimeout(() => { isRedirecting = false }, 2000)
      })
    },
  }) as typeof globalThis.$fetch
})
