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

  // On server-side or if authClient is not available, return empty reactive state
  // The client will hydrate with real data
  if (!authClient || !authClient.useSession) {
    return defaultSessionState
  }

  // Better Auth 1.4.x uses nanostores - these are Atoms, not functions
  // Access the atom directly and create computed refs from its value
  const sessionAtom = authClient.useSession
  const activeOrgAtom = authClient.useActiveOrganization

  // Create computed refs that access the atom's value
  // Use optional chaining since atom value might be undefined during SSR
  const sessionData = computed(() => sessionAtom.value?.data ?? null)
  const isPending = computed(() => sessionAtom.value?.isPending ?? true)
  const sessionError = computed(() => sessionAtom.value?.error ?? null)
  const activeOrgData = computed(() => activeOrgAtom.value?.data ?? null)

  // Computed accessors for cleaner API
  const session = computed<Session | null>(() => {
    if (!sessionData.value?.session) return null
    const s = sessionData.value.session
    return {
      id: s.id,
      token: s.token,
      userId: s.userId,
      expiresAt: new Date(s.expiresAt),
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
      activeOrganizationId: (s as Record<string, unknown>).activeOrganizationId as string | null ?? null
    }
  })

  const user = computed<User | null>(() => {
    if (!sessionData.value?.user) return null
    const u = sessionData.value.user
    return {
      id: u.id,
      email: u.email,
      name: u.name ?? null,
      image: u.image ?? null,
      emailVerified: u.emailVerified ?? false,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.updatedAt)
    }
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
    if (authClient) {
      await authClient.getSession()
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
