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

// Re-export from @fyit/crouton-auth for convenience
// The useEventAccess composable provides the core functionality
export { useEventAccess } from '@fyit/crouton-auth/app/composables/useScopedAccess'

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
  /** Helper's display name (required for new helpers) */
  helperName?: string
  /** Existing helper ID (for returning helpers) */
  helperId?: string
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

  // Cookie and localStorage keys (matching legacy implementation)
  const COOKIE_NAME = 'pos-helper-token'
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
    if (!helperSession.value) {
      loadSession()
    }
    if (!helperSession.value) return false

    // Check expiration
    if (new Date(helperSession.value.expiresAt) < new Date()) {
      clearSession()
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
   * Authenticates with the event's PIN and creates or updates a helper session.
   *
   * @param options - Login options including teamId, eventId, pin, and helper identity
   * @returns True if login succeeded
   */
  async function login(options: HelperLoginOptions): Promise<boolean> {
    const { teamId, eventId, pin, helperName, helperId } = options

    isLoading.value = true
    error.value = null

    try {
      // Build request body
      const body: Record<string, string> = { pin }

      if (helperId) {
        body.helperId = helperId
      }
      else if (helperName) {
        body.helperName = helperName
      }
      else {
        error.value = 'Helper name or ID is required'
        return false
      }

      // Call the helper login endpoint
      // This endpoint validates the PIN and creates/updates the scoped access token
      const response = await $fetch<{
        token: string
        helperName: string
        eventId: string
        expiresAt: string
      }>(`/api/teams/${teamId}/pos-events/${eventId}/helper-login`, {
        method: 'POST',
        body
      })

      // Create session from response
      const session: HelperSession = {
        token: response.token,
        helperName: response.helperName,
        eventId: response.eventId,
        teamId,
        expiresAt: response.expiresAt
      }

      setSession(session)
      return true
    }
    catch (err: unknown) {
      const fetchError = err as { data?: { message?: string; statusMessage?: string }; statusMessage?: string }
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
    logout,
    validateToken,
    loadSession,
    setSession,
    clearSession
  }
}
