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

export interface SessionData {
  session: Session
  user: User
}

/**
 * Get the Better Auth client from the plugin
 */
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}

export function useSession() {
  const authClient = useAuthClient()

  // Use Better Auth's reactive session hook
  const {
    data: sessionData,
    isPending,
    error: sessionError,
  } = authClient.useSession()

  // Use Better Auth's reactive active organization hook
  const {
    data: activeOrgData,
  } = authClient.useActiveOrganization()

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
      activeOrganizationId: (s as Record<string, unknown>).activeOrganizationId as string | null ?? null,
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
      updatedAt: new Date(u.updatedAt),
    }
  })

  const activeOrganization = computed<Team | null>(() => {
    if (!activeOrgData.value) return null
    const org = activeOrgData.value
    // Parse metadata if it's a string
    let metadata: Record<string, unknown> = {}
    if (org.metadata) {
      try {
        metadata = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata
      }
      catch {
        metadata = {}
      }
    }
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
      metadata,
      personal: metadata.personal === true,
      isDefault: metadata.isDefault === true,
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.createdAt), // Better Auth doesn't have updatedAt
    }
  })

  // Error state
  const error = computed<Error | null>(() => {
    return sessionError.value ?? null
  })

  // Authentication check
  const isAuthenticated = computed(() => {
    return !!sessionData.value?.user
  })

  // Session methods
  async function refresh(): Promise<void> {
    // Better Auth's useSession handles this automatically via SWR-like behavior
    // But we can force a refresh by calling getSession
    await authClient.getSession()
  }

  async function clear(): Promise<void> {
    // Sign out clears the session
    await authClient.signOut()
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
    clear,
  }
}
