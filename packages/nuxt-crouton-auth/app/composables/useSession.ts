/**
 * useSession Composable
 *
 * Low-level session management composable using Better Auth client.
 * Provides reactive access to the current session, user, and active organization.
 *
 * Based on atinux's nuxthub-better-auth pattern:
 * - Uses client.getSession() for fetching
 * - Listens to $sessionSignal for automatic updates
 * - Uses useState for shared state across components/middleware/plugins
 *
 * @see https://github.com/atinux/nuxthub-better-auth
 *
 * @example
 * ```vue
 * <script setup>
 * const { session, user, activeOrganization, isPending, isAuthenticated } = useSession()
 * </script>
 * ```
 */
import type { Session, User, Team } from '../../types'
import { useAuthClientSafe } from '../../types/auth-client'

export interface SessionData {
  session: Session
  user: User
}

export function useSession() {
  const authClient = useAuthClientSafe()
  const config = useRuntimeConfig()
  const debug = (config.public?.crouton?.auth as { debug?: boolean } | undefined)?.debug ?? false
  const headers = import.meta.server ? useRequestHeaders() : undefined

  // Shared state using useState (works in components, middleware, plugins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionState = useState<any>('crouton-auth-session', () => null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userState = useState<any>('crouton-auth-user', () => null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeOrgState = useState<any>('crouton-auth-active-org', () => null)
  const isPendingState = useState('crouton-auth-pending', () => true)
  const errorState = useState<Error | null>('crouton-auth-error', () => null)

  // Track if we've set up the signal listener (once per app)
  const isListening = useState('crouton-auth-listening', () => false)

  // Fetch session from Better Auth
  async function fetchSession(): Promise<void> {
    if (!authClient) return

    if (debug) {
      console.log('[@crouton/auth] useSession: fetching session...')
    }

    isPendingState.value = true
    errorState.value = null

    try {
      const { data, error } = await authClient.getSession({
        fetchOptions: { headers }
      })

      if (error) {
        if (debug) {
          console.log('[@crouton/auth] useSession: fetch error', error)
        }
        errorState.value = new Error(error.message ?? 'Session error')
        sessionState.value = null
        userState.value = null
      } else {
        sessionState.value = data?.session ?? null
        userState.value = data?.user ?? null

        if (debug) {
          console.log('[@crouton/auth] useSession: fetched', {
            hasSession: !!data?.session,
            user: data?.user?.email ?? null
          })
        }
      }
    } catch (err) {
      console.error('[@crouton/auth] useSession: fetch failed', err)
      errorState.value = err instanceof Error ? err : new Error('Session fetch failed')
      sessionState.value = null
      userState.value = null
    } finally {
      isPendingState.value = false
    }
  }

  // Fetch active organization
  async function fetchActiveOrg(): Promise<void> {
    if (!authClient?.organization?.getFullOrganization) return

    try {
      const { data, error } = await authClient.organization.getFullOrganization({
        fetchOptions: { headers }
      })

      activeOrgState.value = data ?? null

      if (debug) {
        console.log('[@crouton/auth] useSession: fetched active org', {
          org: data?.slug ?? null,
          error: error ?? null
        })
      }
    } catch (err) {
      if (debug) {
        console.log('[@crouton/auth] useSession: no active org', err)
      }
      activeOrgState.value = null
    }
  }

  // Set up signal listener on client (once per app lifecycle)
  if (import.meta.client && authClient && !isListening.value) {
    isListening.value = true

    if (debug) {
      console.log('[@crouton/auth] useSession: setting up signal listener')
    }

    // Listen to session signal for automatic updates
    // This fires when session changes (login, logout, token refresh)
    authClient.$store?.listen?.('$sessionSignal', async (signal: unknown) => {
      if (!signal) return

      if (debug) {
        console.log('[@crouton/auth] useSession: session signal received')
      }

      await fetchSession()
      await fetchActiveOrg()
    })

    // Initial fetch
    fetchSession().then(() => fetchActiveOrg())
  }

  // On server, try to fetch session if we have headers
  if (import.meta.server && authClient && isPendingState.value) {
    // Use callOnce to avoid duplicate fetches during SSR
    callOnce('crouton-auth-ssr-fetch', async () => {
      await fetchSession()
      await fetchActiveOrg()
    })
  }

  // Computed accessors for cleaner API
  const session = computed<Session | null>(() => {
    if (!sessionState.value) return null
    const s = sessionState.value as Record<string, unknown>
    return {
      id: s.id as string,
      token: s.token as string,
      userId: s.userId as string,
      expiresAt: new Date(s.expiresAt as string | Date),
      ipAddress: s.ipAddress as string | undefined,
      userAgent: s.userAgent as string | undefined,
      activeOrganizationId: s.activeOrganizationId as string | undefined,
      createdAt: new Date((s.createdAt as string | Date) ?? Date.now()),
      updatedAt: new Date((s.updatedAt as string | Date) ?? Date.now())
    } satisfies Session
  })

  const user = computed<User | null>(() => {
    if (!userState.value) return null
    const u = userState.value as Record<string, unknown>
    return {
      id: u.id as string,
      email: u.email as string,
      name: (u.name as string | null) ?? null,
      image: (u.image as string | null) ?? null,
      emailVerified: (u.emailVerified as boolean) ?? false,
      createdAt: new Date(u.createdAt as string | Date),
      updatedAt: new Date(u.updatedAt as string | Date)
    } satisfies User
  })

  const activeOrganization = computed<Team | null>(() => {
    if (!activeOrgState.value) return null
    const org = activeOrgState.value as {
      id: string
      name: string
      slug: string
      logo?: string | null
      metadata?: string | Record<string, unknown> | null
      personal?: boolean | number | null
      isDefault?: boolean | number | null
      ownerId?: string | null
      createdAt: string | Date
    }

    // Parse metadata if it's a string
    let metadata: Record<string, unknown> = {}
    if (org.metadata) {
      try {
        metadata = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata
      } catch {
        metadata = {}
      }
    }

    // SQLite returns 0/1 for booleans
    const isPersonal = org.personal === true || org.personal === 1 || metadata.personal === true
    const isDefaultOrg = org.isDefault === true || org.isDefault === 1 || metadata.isDefault === true

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
      metadata,
      personal: isPersonal,
      isDefault: isDefaultOrg,
      ownerId: org.ownerId ?? (metadata.ownerId as string | undefined),
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.createdAt)
    }
  })

  const isPending = computed(() => isPendingState.value)
  const error = computed(() => errorState.value)
  const isAuthenticated = computed(() => !!userState.value)

  // Expose sessionData for backward compatibility
  const sessionData = computed(() => {
    if (!sessionState.value && !userState.value) return null
    return {
      session: sessionState.value,
      user: userState.value
    }
  })

  // Methods
  async function refresh(): Promise<void> {
    if (debug) {
      console.log('[@crouton/auth] useSession: refresh called')
    }
    await fetchSession()
    await fetchActiveOrg()
  }

  async function clear(): Promise<void> {
    if (authClient) {
      await authClient.signOut()
    }
    sessionState.value = null
    userState.value = null
    activeOrgState.value = null
  }

  return {
    // Raw data (for advanced use)
    data: sessionData,

    // Computed accessors (recommended)
    session,
    user,
    activeOrganization,

    // Status
    isPending,
    error,
    isAuthenticated,

    // Methods
    refresh,
    clear
  }
}
