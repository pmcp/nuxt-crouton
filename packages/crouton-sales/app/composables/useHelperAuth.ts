/**
 * Helper Authentication Composable
 *
 * Provides authentication for event helpers (volunteers, staff) in the POS system.
 * This composable wraps `@fyit/crouton-auth`'s scoped access functionality to provide
 * PIN-based authentication scoped to specific events.
 *
 * Helpers authenticate with:
 * - An event's shared PIN
 * - Their display name (create or select existing)
 *
 * @example
 * ```vue
 * <script setup>
 * const {
 *   isHelper,
 *   helperName,
 *   eventId,
 *   login,
 *   logout
 * } = useHelperAuth()
 *
 * async function handleLogin(pin: string, name: string) {
 *   await login({
 *     teamId: 'team-123',
 *     eventId: 'event-456',
 *     pin,
 *     helperName: name
 *   })
 * }
 * </script>
 * ```
 */

// Note: useEventAccess from @fyit/crouton-auth is auto-imported as a Nuxt
// layer composable — no explicit re-export needed.

export interface HelperSession {
  token: string
  helperName: string
  eventId: string
  teamId: string
  expiresAt: string
}

export interface HelperLoginOptions {
  /** Team/organization ID */
  teamId: string
  /** Event ID to authenticate for */
  eventId: string
  /** Event PIN for authentication */
  pin: string
  /** Helper's display name */
  helperName?: string
}

/**
 * Helper authentication composable
 *
 * Provides backwards-compatible API matching the original useHelperAuth.
 * Uses @fyit/crouton-auth's scoped access under the hood.
 */
export function useHelperAuth() {
  // State management using Nuxt's useState for SSR compatibility
  const helperSession = useState<HelperSession | null>('helper-session', () => null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // The shared event session (crouton-auth): the page gate writes it when a
  // scoped page redeems the event's helper PIN, and our own PIN login writes
  // through it. Adoption copies from it; logout clears it (see logout()).
  const eventAccess = useScopedAccess('event')

  // Canonical token cookie (read server-side by requireScopedAccess and
  // crouton-pages' scoped visibility); localStorage holds the session blob.
  const COOKIE_NAME = 'scoped-access-token'
  const STORAGE_KEY = 'pos-helper-info'
  const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

  /**
   * Load session from localStorage
   */
  function loadSession(): HelperSession | null {
    if (!import.meta.client) return null

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const session = JSON.parse(stored) as HelperSession

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        clearSession()
        return null
      }

      helperSession.value = session
      return session
    }
    catch {
      clearSession()
      return null
    }
  }

  /**
   * Check if helper is authenticated
   */
  const isHelper = computed(() => {
    if (!helperSession.value) return false

    // Check expiration
    if (new Date(helperSession.value.expiresAt) < new Date()) {
      return false
    }

    return true
  })

  // Computed properties for session data
  const helperName = computed(() => helperSession.value?.helperName || '')
  const eventId = computed(() => helperSession.value?.eventId || '')
  const teamId = computed(() => helperSession.value?.teamId || '')
  const token = computed(() => helperSession.value?.token || '')

  /**
   * Clear the session
   */
  function clearSession(): void {
    helperSession.value = null

    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)

      const helperToken = useCookie(COOKIE_NAME)
      helperToken.value = null
    }
  }

  /**
   * Set session (used after successful login)
   */
  function setSession(session: HelperSession): void {
    helperSession.value = session

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))

      const helperToken = useCookie(COOKIE_NAME, {
        maxAge: COOKIE_MAX_AGE
      })
      helperToken.value = session.token
    }
  }

  /**
   * Login as helper
   *
   * Redeems the event's PIN against crouton-auth's generic redeem endpoint
   * (the before-redeem hook lazily syncs `salesEvents.helperPin` into the
   * event grant server-side — the bespoke helper-login endpoint is gone).
   * Goes through `useScopedAccess('event')` so the shared event session and
   * this composable's session stay aligned. The pin is trimmed here — the
   * generic endpoint does not trim server-side.
   *
   * @param options - Login options including teamId, eventId, pin, and helper name
   * @returns True if login succeeded
   */
  async function login(options: HelperLoginOptions): Promise<boolean> {
    const { teamId, eventId, pin, helperName } = options

    error.value = null

    if (!helperName) {
      error.value = 'Helper name is required'
      return false
    }

    isLoading.value = true

    try {
      const success = await eventAccess.redeem({
        teamId,
        resourceId: eventId,
        secret: String(pin).trim(),
        displayName: helperName
      })

      if (!success) {
        error.value = eventAccess.error.value || 'Login failed'
        return false
      }

      const source = eventAccess.session.value!
      setSession({
        token: source.token,
        helperName: source.displayName,
        eventId: source.resourceId,
        teamId: source.organizationId || teamId,
        expiresAt: source.expiresAt
      })
      return true
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Adopt the page gate's event session
   *
   * When a scoped CMS page embeds the kassa, its access gate already
   * redeemed the event's helper PIN and stored an ('event', eventId) session
   * via useScopedAccess — adopting it means the volunteer never sees a
   * second PIN form. The session is **copied** (not referenced) into our own
   * localStorage session, so the shift survives later clobbering of the
   * shared cookies by other scoped flows.
   *
   * @returns True if a matching gate session was adopted
   */
  function adoptScopedSession(options: { teamId: string, eventId: string }): boolean {
    const source = eventAccess.session.value ?? eventAccess.loadSession()
    if (!source?.token) return false
    if (source.resourceId !== options.eventId) return false
    if (source.organizationId && source.organizationId !== options.teamId) return false
    if (new Date(source.expiresAt) < new Date()) return false

    setSession({
      token: source.token,
      helperName: source.displayName,
      eventId: source.resourceId,
      teamId: source.organizationId || options.teamId,
      expiresAt: source.expiresAt
    })
    return true
  }

  /**
   * Login as a team member (no PIN)
   *
   * Uses the admin-helper-token endpoint: the logged-in team session is the
   * credential, the server issues the same scoped helper token (displayName =
   * the user's name) so all downstream POS endpoints work unchanged.
   *
   * @returns True if a session was established
   */
  async function loginAsAdmin(options: { teamId: string, eventId: string }): Promise<boolean> {
    const { teamId, eventId } = options

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        token: string
        helperName: string
        eventId: string
        expiresAt: string
      }>(`/api/crouton-sales/teams/${teamId}/events/${eventId}/admin-helper-token`, {
        method: 'POST'
      })

      setSession({
        token: response.token,
        helperName: response.helperName,
        eventId: response.eventId,
        teamId,
        expiresAt: response.expiresAt
      })
      return true
    }
    catch (err: unknown) {
      const fetchError = err as { data?: { message?: string, statusMessage?: string }, statusMessage?: string }
      error.value = fetchError.data?.message || fetchError.data?.statusMessage || fetchError.statusMessage || 'Login failed'
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Validate current session with server
   */
  async function validateToken(): Promise<boolean> {
    const session = helperSession.value || loadSession()
    if (!session) return false

    // Check local expiration first
    if (new Date(session.expiresAt) < new Date()) {
      clearSession()
      return false
    }

    // Optionally validate with server
    try {
      const response = await $fetch<{ valid: boolean }>('/api/auth/scoped-access/validate', {
        method: 'POST',
        body: { token: session.token }
      })
      return response.valid
    }
    catch {
      // If server validation fails, still trust local session until expiration
      return true
    }
  }

  /**
   * Logout helper
   *
   * Also clears the shared `useScopedAccess('event')` session this one was
   * adopted from (or wrote through). Without that, logout is a no-op by
   * construction: the panel's mount order (adopt → admin → PIN form) would
   * immediately re-adopt the persistent source — as the same name on a
   * handover, or as a revoked token landing checkout in an error state
   * instead of the PIN form.
   */
  async function logout(): Promise<void> {
    // Revoke token on server (fire and forget)
    if (helperSession.value?.token) {
      $fetch('/api/auth/scoped-access/logout', {
        method: 'POST',
        body: { token: helperSession.value.token }
      }).catch(() => {
        // Ignore errors - session is cleared locally regardless
      })
    }

    eventAccess.clearSession()
    clearSession()
  }

  // Initialize session on client mount
  if (import.meta.client) {
    loadSession()
  }

  return {
    // State
    isHelper,
    helperName,
    eventId,
    teamId,
    token,
    helperSession: readonly(helperSession),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Methods
    login,
    loginAsAdmin,
    adoptScopedSession,
    logout,
    validateToken,
    loadSession,
    setSession,
    clearSession
  }
}
