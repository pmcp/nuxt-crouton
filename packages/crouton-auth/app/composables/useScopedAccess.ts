/**
 * Scoped Access Composable
 *
 * Client-side composable for managing scoped access tokens.
 * Used for lightweight, resource-scoped authentication scenarios like:
 * - Event helpers (POS/sales)
 * - Guest access to bookings
 * - Temporary attendee access
 *
 * @example
 * ```vue
 * <script setup>
 * const {
 *   isAuthenticated,
 *   displayName,
 *   resourceId,
 *   login,
 *   logout
 * } = useScopedAccess('event')
 *
 * async function handleLogin(pin: string, name: string) {
 *   await login({ pin, displayName: name, resourceId: eventId })
 * }
 * </script>
 * ```
 */

export interface ScopedAccessSession {
  token: string
  displayName: string
  organizationId: string
  resourceType: string
  resourceId: string
  role: string
  expiresAt: string
}

export interface ScopedAccessLoginOptions {
  /** Login endpoint URL */
  loginEndpoint: string
  /** Request body for login */
  body: Record<string, unknown>
}

export interface UseScopedAccessOptions {
  /** Cookie name for storing the token (default: 'scoped-access-token') */
  cookieName?: string
  /** LocalStorage key for session data (default: 'scoped-access-session') */
  storageKey?: string
  /** Cookie max age in seconds (default: 8 hours) */
  cookieMaxAge?: number
}

/**
 * Composable for managing scoped access authentication
 *
 * @param resourceType - Type of resource this access is for (e.g., 'event')
 * @param options - Configuration options
 */
export function useScopedAccess(
  resourceType: string,
  options: UseScopedAccessOptions = {}
) {
  const {
    cookieName = 'scoped-access-token',
    storageKey = 'scoped-access-session',
    cookieMaxAge = 60 * 60 * 8 // 8 hours
  } = options

  // State
  const session = useState<ScopedAccessSession | null>(`scoped-access-${resourceType}`, () => null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const isAuthenticated = computed(() => {
    if (!session.value) return false
    // Check if expired
    if (new Date(session.value.expiresAt) < new Date()) {
      clearSession()
      return false
    }
    return true
  })

  const token = computed(() => session.value?.token || '')
  const displayName = computed(() => session.value?.displayName || '')
  const organizationId = computed(() => session.value?.organizationId || '')
  const resourceId = computed(() => session.value?.resourceId || '')
  const role = computed(() => session.value?.role || '')
  const expiresAt = computed(() => session.value?.expiresAt ? new Date(session.value.expiresAt) : null)

  /**
   * Load session from localStorage
   */
  function loadSession(): ScopedAccessSession | null {
    if (!import.meta.client) return null

    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return null

      const data = JSON.parse(stored) as ScopedAccessSession

      // Validate resource type matches
      if (data.resourceType !== resourceType) return null

      // Check if expired
      if (new Date(data.expiresAt) < new Date()) {
        clearSession()
        return null
      }

      session.value = data
      return data
    }
    catch {
      clearSession()
      return null
    }
  }

  /**
   * Save session to localStorage and cookie
   */
  function saveSession(data: ScopedAccessSession): void {
    session.value = data

    if (import.meta.client) {
      localStorage.setItem(storageKey, JSON.stringify(data))

      // Also set cookie for server-side validation
      const tokenCookie = useCookie(cookieName, {
        maxAge: cookieMaxAge
      })
      tokenCookie.value = data.token
    }
  }

  /**
   * Clear session from state, localStorage, and cookie
   */
  function clearSession(): void {
    session.value = null

    if (import.meta.client) {
      localStorage.removeItem(storageKey)

      const tokenCookie = useCookie(cookieName)
      tokenCookie.value = null
    }
  }

  /**
   * Login with scoped access
   *
   * Makes a request to the specified login endpoint and stores the returned session.
   *
   * @param loginOptions - Login endpoint and request body
   * @returns True if login succeeded
   */
  async function login(loginOptions: ScopedAccessLoginOptions): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        token: string
        displayName?: string
        helperName?: string // For backwards compatibility
        organizationId?: string
        teamId?: string // For backwards compatibility
        resourceId?: string
        eventId?: string // For backwards compatibility
        role?: string
        expiresAt: string
      }>(loginOptions.loginEndpoint, {
        method: 'POST',
        body: loginOptions.body
      })

      // Build session from response (support both new and legacy field names)
      const sessionData: ScopedAccessSession = {
        token: response.token,
        displayName: response.displayName || response.helperName || 'Guest',
        organizationId: response.organizationId || response.teamId || '',
        resourceType,
        resourceId: response.resourceId || response.eventId || '',
        role: response.role || 'guest',
        expiresAt: response.expiresAt
      }

      saveSession(sessionData)
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
   * Logout and clear session
   */
  async function logout(): Promise<void> {
    // Optionally notify server to revoke token
    if (session.value?.token) {
      try {
        // Fire and forget - don't block logout on server response
        $fetch('/api/auth/scoped-access/logout', {
          method: 'POST',
          body: { token: session.value.token }
        }).catch(() => {
          // Ignore errors - session is cleared locally regardless
        })
      }
      catch {
        // Ignore errors
      }
    }

    clearSession()
  }

  /**
   * Validate current session with server
   *
   * @returns True if session is valid
   */
  async function validateSession(): Promise<boolean> {
    if (!session.value?.token) return false

    try {
      const response = await $fetch<{ valid: boolean }>('/api/auth/scoped-access/validate', {
        method: 'POST',
        body: { token: session.value.token }
      })
      return response.valid
    }
    catch {
      clearSession()
      return false
    }
  }

  /**
   * Refresh session expiration
   *
   * @param additionalHours - Hours to add to expiration (default: 8)
   * @returns True if refresh succeeded
   */
  async function refreshSession(additionalHours = 8): Promise<boolean> {
    if (!session.value?.token) return false

    try {
      const response = await $fetch<{ expiresAt: string }>('/api/auth/scoped-access/refresh', {
        method: 'POST',
        body: {
          token: session.value.token,
          additionalTime: additionalHours * 60 * 60 * 1000
        }
      })

      if (response.expiresAt) {
        session.value = {
          ...session.value,
          expiresAt: response.expiresAt
        }
        saveSession(session.value)
        return true
      }
      return false
    }
    catch {
      return false
    }
  }

  // Initialize session on mount (client-side only)
  if (import.meta.client) {
    loadSession()
  }

  return {
    // State
    session: readonly(session),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    isAuthenticated,
    token,
    displayName,
    organizationId,
    resourceId,
    role,
    expiresAt,

    // Methods
    login,
    logout,
    loadSession,
    clearSession,
    validateSession,
    refreshSession
  }
}

/**
 * Shorthand for event-scoped access (POS helpers)
 */
export function useEventAccess(options?: Omit<UseScopedAccessOptions, 'storageKey'>) {
  return useScopedAccess('event', {
    ...options,
    storageKey: 'pos-helper-info', // Match legacy storage key
    cookieName: options?.cookieName || 'pos-helper-token' // Match legacy cookie name
  })
}

/**
 * Shorthand for booking-scoped access
 */
export function useBookingAccess(options?: Omit<UseScopedAccessOptions, 'storageKey'>) {
  return useScopedAccess('booking', {
    ...options,
    storageKey: 'booking-access-session',
    cookieName: options?.cookieName || 'booking-access-token'
  })
}
