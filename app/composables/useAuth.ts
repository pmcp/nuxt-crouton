/**
 * useAuth Composable
 *
 * Main authentication composable providing reactive user state and auth methods.
 *
 * @example
 * ```vue
 * <script setup>
 * const { user, loggedIn, login, logout } = useAuth()
 *
 * async function handleLogin() {
 *   await login({ email: 'user@example.com', password: 'password' })
 * }
 * </script>
 * ```
 */
import type { User } from '../../types'

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  password: string
  name?: string
}

export function useAuth() {
  const config = useRuntimeConfig().public.crouton?.auth

  // TODO: Phase 4 - Connect to Better Auth client
  // const client = useBetterAuthClient()
  // const session = useSession()

  // Reactive state (placeholders)
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const loggedIn = computed(() => !!user.value)

  // Capability flags based on config
  const hasPassword = computed(() => {
    const method = config?.methods?.password
    return method !== false && method !== undefined
  })

  const hasOAuth = computed(() => {
    return !!config?.methods?.oauth && Object.keys(config.methods.oauth).length > 0
  })

  const hasPasskeys = computed(() => {
    const method = config?.methods?.passkeys
    return method === true || (typeof method === 'object' && method.enabled !== false)
  })

  const has2FA = computed(() => {
    const method = config?.methods?.twoFactor
    return method === true || (typeof method === 'object' && method.enabled !== false)
  })

  const hasMagicLink = computed(() => {
    const method = config?.methods?.magicLink
    return method === true || (typeof method === 'object' && method.enabled !== false)
  })

  const oauthProviders = computed(() => {
    if (!config?.methods?.oauth) return []
    return Object.keys(config.methods.oauth)
  })

  // Auth methods (placeholders - to be implemented in Phase 4)
  async function login(_credentials: LoginCredentials): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // await client.signIn.email(credentials)
      throw new Error('@crouton/auth: Login not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Login failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function loginWithOAuth(_provider: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // await client.signIn.social({ provider })
      throw new Error('@crouton/auth: OAuth login not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'OAuth login failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function loginWithPasskey(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Passkey login not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Passkey login failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function loginWithMagicLink(_email: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Magic link login not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Magic link failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function register(_data: RegisterData): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Registration not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Registration failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // await client.signOut()
      user.value = null
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Logout failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function forgotPassword(_email: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Forgot password not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Request failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function resetPassword(_token: string, _password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Reset password not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Reset failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return {
    // State
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    loggedIn,

    // Capability flags
    hasPassword,
    hasOAuth,
    hasPasskeys,
    has2FA,
    hasMagicLink,
    oauthProviders,

    // Methods
    login,
    loginWithOAuth,
    loginWithPasskey,
    loginWithMagicLink,
    register,
    logout,
    forgotPassword,
    resetPassword,
  }
}
