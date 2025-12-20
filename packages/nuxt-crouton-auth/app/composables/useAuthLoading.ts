/**
 * useAuthLoading Composable
 *
 * Provides centralized loading state management for auth operations.
 * Tracks multiple concurrent operations and exposes global loading state.
 *
 * @example
 * ```typescript
 * const { isLoading, startLoading, stopLoading, withLoading } = useAuthLoading()
 *
 * // Manual loading control
 * startLoading('login')
 * try {
 *   await login(credentials)
 * } finally {
 *   stopLoading('login')
 * }
 *
 * // Automatic loading wrapper
 * const login = withLoading('login', async () => {
 *   await authClient.signIn.email(credentials)
 * })
 * ```
 */

// Global loading state (shared across components)
const loadingOperations = ref<Set<string>>(new Set())

export function useAuthLoading() {
  /**
   * Check if any operation is loading
   */
  const isLoading = computed(() => loadingOperations.value.size > 0)

  /**
   * Check if a specific operation is loading
   */
  function isOperationLoading(operation: string): boolean {
    return loadingOperations.value.has(operation)
  }

  /**
   * Start loading for an operation
   */
  function startLoading(operation: string) {
    loadingOperations.value.add(operation)
  }

  /**
   * Stop loading for an operation
   */
  function stopLoading(operation: string) {
    loadingOperations.value.delete(operation)
  }

  /**
   * Wrap an async function with loading state
   */
  function withLoading<T extends (...args: any[]) => Promise<any>>(
    operation: string,
    fn: T
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    return async (...args: Parameters<T>) => {
      startLoading(operation)
      try {
        return await fn(...args)
      } finally {
        stopLoading(operation)
      }
    }
  }

  /**
   * Get loading state for a specific operation as a computed ref
   */
  function getLoadingRef(operation: string) {
    return computed(() => isOperationLoading(operation))
  }

  // Common loading operation names
  const loadingStates = {
    login: getLoadingRef('login'),
    register: getLoadingRef('register'),
    logout: getLoadingRef('logout'),
    session: getLoadingRef('session'),
    team: getLoadingRef('team'),
    members: getLoadingRef('members'),
    billing: getLoadingRef('billing'),
    profile: getLoadingRef('profile'),
    password: getLoadingRef('password'),
    twoFactor: getLoadingRef('twoFactor'),
    passkey: getLoadingRef('passkey')
  }

  return {
    // Global state
    isLoading,
    loadingOperations: computed(() => Array.from(loadingOperations.value)),

    // Actions
    startLoading,
    stopLoading,
    isOperationLoading,
    withLoading,
    getLoadingRef,

    // Common loading states
    ...loadingStates
  }
}

/**
 * Auth Loading Indicator Component (inline)
 *
 * Use in templates to show loading state:
 * <AuthLoadingIndicator v-if="isLoading" />
 */
export const LOADING_OPERATIONS = {
  LOGIN: 'login',
  REGISTER: 'register',
  LOGOUT: 'logout',
  SESSION: 'session',
  TEAM: 'team',
  TEAM_SWITCH: 'team-switch',
  TEAM_CREATE: 'team-create',
  TEAM_UPDATE: 'team-update',
  TEAM_DELETE: 'team-delete',
  MEMBERS: 'members',
  MEMBER_INVITE: 'member-invite',
  MEMBER_REMOVE: 'member-remove',
  BILLING: 'billing',
  CHECKOUT: 'checkout',
  PROFILE: 'profile',
  PASSWORD: 'password',
  TWO_FACTOR: 'two-factor',
  TWO_FACTOR_ENABLE: 'two-factor-enable',
  TWO_FACTOR_DISABLE: 'two-factor-disable',
  PASSKEY: 'passkey',
  PASSKEY_ADD: 'passkey-add',
  PASSKEY_REMOVE: 'passkey-remove',
  OAUTH: 'oauth',
  MAGIC_LINK: 'magic-link',
  PASSWORD_RESET: 'password-reset'
} as const

export type LoadingOperation = (typeof LOADING_OPERATIONS)[keyof typeof LOADING_OPERATIONS]
