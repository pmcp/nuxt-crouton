/**
 * useSession Composable
 *
 * Low-level session management composable.
 * For most use cases, prefer useAuth() which wraps this.
 *
 * @example
 * ```vue
 * <script setup>
 * const { session, refresh, clear } = useSession()
 * </script>
 * ```
 */
import type { Session, User, Team } from '../../types'

export interface SessionData {
  session: Session
  user: User
  activeOrganization?: Team
}

export function useSession() {
  // TODO: Phase 4 - Connect to Better Auth session
  // const client = useBetterAuthClient()
  // const { data, pending, error, refresh } = client.useSession()

  // Reactive state (placeholders)
  const data = ref<SessionData | null>(null)
  const pending = ref(false)
  const error = ref<Error | null>(null)

  // Computed accessors
  const session = computed(() => data.value?.session ?? null)
  const user = computed(() => data.value?.user ?? null)
  const activeOrganization = computed(() => data.value?.activeOrganization ?? null)

  // Session methods
  async function refresh(): Promise<void> {
    pending.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // await client.session.refresh()
      console.log('@crouton/auth: Session refresh not yet implemented')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e : new Error('Session refresh failed')
      throw e
    }
    finally {
      pending.value = false
    }
  }

  async function clear(): Promise<void> {
    try {
      // TODO: Phase 4 - Implement with Better Auth
      data.value = null
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e : new Error('Session clear failed')
      throw e
    }
  }

  return {
    // Raw data
    data: readonly(data),
    pending: readonly(pending),
    error: readonly(error),

    // Computed accessors
    session,
    user,
    activeOrganization,

    // Methods
    refresh,
    clear,
  }
}
