/**
 * useSession Composable
 *
 * Low-level session management composable using Better Auth client.
 * Provides reactive access to the current session, user, and active organization.
 *
 * Uses Nuxt's useState for shared state across all callers (components, middleware, plugins).
 * Subscriptions to Better Auth nanostores are setup ONCE per app lifecycle.
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

// State keys for useState
const SESSION_STATE_KEY = 'crouton-auth-session-atom'
const ORG_STATE_KEY = 'crouton-auth-org-atom'
const SUBSCRIBED_KEY = 'crouton-auth-subscribed'

export function useSession() {
  const authClient = useAuthClientSafe()
  const config = useRuntimeConfig()
  const debug = (config.public?.crouton?.auth as { debug?: boolean } | undefined)?.debug ?? false

  // Use useState for shared state - works in components, middleware, plugins
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionAtomValue = useState<any>(SESSION_STATE_KEY, () => {
    return authClient?.useSession?.value ?? null
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeOrgAtomValue = useState<any>(ORG_STATE_KEY, () => {
    return authClient?.useActiveOrganization?.value ?? null
  })

  // Track if subscriptions are setup (once per app, not per call)
  const isSubscribed = useState(SUBSCRIBED_KEY, () => false)

  // Setup nanostore subscriptions ONCE for the app lifecycle
  // No cleanup needed - these are intentionally long-lived
  if (import.meta.client && authClient?.useSession && !isSubscribed.value) {
    isSubscribed.value = true

    const sessionAtom = authClient.useSession
    const activeOrgAtom = authClient.useActiveOrganization

    // Subscribe to session atom changes
    sessionAtom.subscribe((value: unknown) => {
      if (debug) {
        console.log('[@crouton/auth] useSession: sessionAtom updated', {
          hasData: !!(value as { data?: unknown })?.data,
          isPending: (value as { isPending?: boolean })?.isPending,
          user: ((value as { data?: { user?: { email?: string } } })?.data?.user?.email) ?? null
        })
      }
      sessionAtomValue.value = value
    })

    // Subscribe to active org atom changes
    activeOrgAtom.subscribe((value: unknown) => {
      if (debug) {
        console.log('[@crouton/auth] useSession: activeOrgAtom updated', {
          hasData: !!value,
          org: ((value as { data?: { slug?: string } })?.data?.slug) ?? null
        })
      }
      activeOrgAtomValue.value = value
    })

    if (debug) {
      console.log('[@crouton/auth] useSession: subscriptions setup (once)')
    }
  }

  // On server-side or if authClient is not available, return SSR-safe defaults
  if (!authClient || !authClient.useSession) {
    if (debug) {
      console.log('[@crouton/auth] useSession: no authClient available (SSR or not initialized)')
    }
    return {
      data: computed(() => null),
      session: computed(() => null as Session | null),
      user: computed(() => null as User | null),
      activeOrganization: computed(() => null as Team | null),
      isPending: computed(() => true),
      error: computed(() => null as Error | null),
      isAuthenticated: computed(() => false),
      refresh: async () => {},
      clear: async () => {}
    }
  }

  // Debug: Log initial state
  if (debug) {
    console.log('[@crouton/auth] useSession: initial state', {
      sessionAtomValue: sessionAtomValue.value,
      activeOrgAtomValue: activeOrgAtomValue.value
    })
  }

  // Create computed refs that access the Vue ref values (now reactive!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionData = computed<{ user?: any, session?: any } | null>(() => {
    const atomVal = sessionAtomValue.value as { data?: { user?: any, session?: any } } | null
    const data = atomVal?.data ?? null
    if (debug) {
      console.log('[@crouton/auth] useSession: sessionData computed', {
        hasData: !!data,
        user: data?.user?.email ?? null,
        session: data?.session?.id ?? null
      })
    }
    return data
  })

  const isPending = computed(() => {
    const atomVal = sessionAtomValue.value as { isPending?: boolean } | null
    return atomVal?.isPending ?? true
  })

  const sessionError = computed(() => {
    const atomVal = sessionAtomValue.value as { error?: { message?: string } } | null
    return atomVal?.error ?? null
  })

  const activeOrgData = computed(() => {
    const atomVal = activeOrgAtomValue.value as { data?: unknown } | null
    return atomVal?.data ?? null
  })

  // Computed accessors for cleaner API
  const session = computed(() => {
    if (!sessionData.value?.session) return null as Session | null
    const s = sessionData.value.session as Record<string, unknown>
    return {
      id: s.id as string,
      token: s.token as string,
      userId: s.userId as string,
      expiresAt: new Date(s.expiresAt as string | Date),
      ipAddress: s.ipAddress as string | undefined,
      userAgent: s.userAgent as string | undefined,
      activeOrganizationId: s.activeOrganizationId as string | undefined,
      createdAt: new Date(s.createdAt as string | Date ?? Date.now()),
      updatedAt: new Date(s.updatedAt as string | Date ?? Date.now())
    } satisfies Session
  })

  const user = computed(() => {
    if (!sessionData.value?.user) return null as User | null
    const u = sessionData.value.user as Record<string, unknown>
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
    if (!activeOrgData.value) return null
    const org = activeOrgData.value as {
      id: string
      name: string
      slug: string
      logo?: string | null
      personal?: boolean | number | null
      isDefault?: boolean | number | null
      ownerId?: string | null
      createdAt: string | Date
    }
    // SQLite returns 0/1 for booleans, so check for truthy value
    const isPersonal = org.personal === true || org.personal === 1
    const isDefaultOrg = org.isDefault === true || org.isDefault === 1
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
      metadata: {},
      personal: isPersonal,
      isDefault: isDefaultOrg,
      ownerId: org.ownerId ?? undefined,
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.createdAt)
    }
  })

  // Error state
  const error = computed<Error | null>(() => {
    const err = sessionError.value
    if (!err) return null
    return new Error(err.message ?? 'Session error')
  })

  // Authentication check
  const isAuthenticated = computed(() => {
    return !!sessionData.value?.user
  })

  // Session methods
  async function refresh(): Promise<void> {
    // Better Auth's useSession handles this automatically via SWR-like behavior
    // But we can force a refresh by calling getSession
    // The nanostore subscription will automatically update our Vue refs
    if (authClient) {
      if (debug) {
        console.log('[@crouton/auth] useSession: refresh called, fetching session...')
      }
      const result = await authClient.getSession({
        fetchOptions: {
          // Force refetch to update the nanostore
          onSuccess: () => {
            if (debug) {
              console.log('[@crouton/auth] useSession: getSession onSuccess, nanostore should update')
            }
          }
        }
      })
      if (debug) {
        console.log('[@crouton/auth] useSession: refresh result', {
          hasData: !!result.data,
          user: result.data?.user?.email ?? null,
          error: result.error ?? null
        })
      }
    }
  }

  async function clear(): Promise<void> {
    // Sign out clears the session
    if (authClient) {
      await authClient.signOut()
    }
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
