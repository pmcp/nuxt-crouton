/**
 * Bridge the POS helper session into the page nav's auth pill.
 *
 * crouton-pages' <Nav> can't import crouton-sales' useHelperAuth, so this
 * plugin publishes a *serializable* snapshot of the active helper session into
 * a shared useState the nav reads (`crouton:scoped-session`), and registers a
 * hook the nav fires to log out (`crouton:scoped-session:logout`).
 *
 * Logout has to run the full useHelperAuth.logout() — it revokes the server
 * token, clears the scoped `event` session AND the helper localStorage mirror.
 * A generic scoped-token clear would leave the mirror behind, so the kassa
 * would still think it was logged in. Owning it here keeps that complete.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { isHelper, helperName, logout, loadSession } = useHelperAuth()
  // The page gate creates a scoped 'event' session immediately, but the helper
  // session is only populated once the kassa panel mounts and adopts it. Reflect
  // either, so the nav knows a volunteer is signed in even on the launcher page
  // (before the POS modal has been opened).
  const eventAccess = useScopedAccess('event')

  // Hydrate from localStorage, then mirror the reactive session into the
  // shared state the nav consumes (display-only — no functions, so it stays
  // SSR-serializable).
  loadSession()
  const navSession = useState<{ displayName: string } | null>('crouton:scoped-session', () => null)
  watchEffect(() => {
    const active = isHelper.value || eventAccess.isAuthenticated.value
    navSession.value = active
      ? { displayName: helperName.value || eventAccess.displayName.value }
      : null
  })

  // The nav's logout button fires this; we run the complete teardown.
  nuxtApp.hook('crouton:scoped-session:logout' as any, async () => {
    await logout()
    navSession.value = null
  })
})
