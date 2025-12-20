/**
 * useSession Composable
 *
 * Low-level session management composable using Better Auth client.
 * Provides reactive access to the current session, user, and active organization.
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

// Default SSR-safe return value
const defaultSessionState = {
  data: ref(null),
  session: computed(() => null),
  user: computed(() => null),
  activeOrganization: computed(() => null),
  isPending: ref(true),
  error: computed(() => null),
  isAuthenticated: computed(() => false),
  refresh: async () => {},
  clear: async () => {}
}

export function useSession() {
  const authClient = useAuthClientSafe()
  const config = useRuntimeConfig()
  const debug = (config.public?.crouton?.auth as { debug?: boolean } | undefined)?.debug ?? false

  // On server-side or if authClient is not available, return empty reactive state
  // The client will hydrate with real data
  if (!authClient || !authClient.useSession) {
    if (debug) {
      console.log('[@crouton/auth] useSession: no authClient available (SSR or not initialized)')
    }
    return defaultSessionState
  }

  // Better Auth 1.4.x uses nanostores - these are Atoms
  // We need to subscribe to them and update Vue refs when they change
  const sessionAtom = authClient.useSession
  const activeOrgAtom = authClient.useActiveOrganization

  // Create Vue refs to hold the nanostore values
  // These will be updated when the nanostores change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionAtomValue = ref<any>(sessionAtom.value)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeOrgAtomValue = ref<any>(activeOrgAtom.value)

  // Subscribe to nanostore changes and update Vue refs
  // This bridges nanostore reactivity with Vue's reactivity system
  if (import.meta.client) {
    // Subscribe to session atom changes
    const unsubSession = sessionAtom.subscribe((value: unknown) => {
      if (debug) {
        console.log('[@crouton/auth] useSession: sessionAtom updated', {
          hasData: !!(value as { data?: unknown })?.data,
          isPending: (value as { isPending?: boolean })?.isPending,
          user: ((value as { data?: { user?: { email?: string } } })?.data?.user?.email) ?? null
        })
      }
      sessionAtomValue.value = value as any
    })

    // Subscribe to active org atom changes
    const unsubOrg = activeOrgAtom.subscribe((value: unknown) => {
      if (debug) {
        console.log('[@crouton/auth] useSession: activeOrgAtom updated', {
          hasData: !!value,
          org: ((value as { data?: { slug?: string } })?.data?.slug) ?? null
        })
      }
      activeOrgAtomValue.value = value as any
    })

    // Clean up subscriptions when component unmounts
    onUnmounted(() => {
      unsubSession()
      unsubOrg()
    })
  }

  // Debug: Log initial atom state
  if (debug) {
    console.log('[@crouton/auth] useSession: initial atom state', {
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
      metadata?: string | Record<string, unknown> | null
      // New columns from Task 6.2
      personal?: boolean | number | null
      isDefault?: boolean | number | null
      ownerId?: string | null
      createdAt: string | Date
    }
    // Parse metadata if it's a string (for legacy data)
    let metadata: Record<string, unknown> = {}
    if (org.metadata) {
      try {
        metadata = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata
      } catch {
        metadata = {}
      }
    }
    // Prefer new columns (Task 6.2), fall back to metadata for backward compatibility
    // SQLite returns 0/1 for booleans, so check for truthy value
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
      updatedAt: new Date(org.createdAt) // Better Auth doesn't have updatedAt
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
