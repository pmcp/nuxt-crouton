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

export interface PasskeyInfo {
  id: string
  name: string
  createdAt: Date
  lastUsedAt?: Date
  credentialId: string
}

export interface AddPasskeyOptions {
  /** Name for the passkey (e.g., "My Laptop", "Work Phone") */
  name?: string
  /**
   * Authenticator attachment preference
   * - 'platform': Built-in authenticators (fingerprint, Face ID)
   * - 'cross-platform': External devices (security keys)
   */
  authenticatorAttachment?: 'platform' | 'cross-platform'
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
      // await client.signIn.passkey()
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

  /**
   * Login with passkey using browser autofill (conditional UI)
   *
   * Call this on component mount to enable passkey autofill.
   * The browser will show passkey options when the user focuses
   * on an input with `autocomplete="username webauthn"`.
   */
  async function loginWithPasskeyAutofill(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // await client.signIn.passkey({ autoFill: true })
      throw new Error('@crouton/auth: Passkey autofill not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Passkey autofill failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Register a new passkey for the current user
   *
   * Requires user to be logged in.
   */
  async function addPasskey(_options?: AddPasskeyOptions): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // await client.passkey.addPasskey({
      //   name: options?.name,
      //   authenticatorAttachment: options?.authenticatorAttachment
      // })
      throw new Error('@crouton/auth: Add passkey not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Add passkey failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * List all passkeys for the current user
   */
  async function listPasskeys(): Promise<PasskeyInfo[]> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // return await client.passkey.listUserPasskeys({})
      throw new Error('@crouton/auth: List passkeys not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'List passkeys failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Delete a passkey by ID
   */
  async function deletePasskey(_id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // await client.passkey.deletePasskey({ id })
      throw new Error('@crouton/auth: Delete passkey not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Delete passkey failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Update passkey name
   */
  async function updatePasskey(_id: string, _name: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      // await client.passkey.updatePasskey({ id, name })
      throw new Error('@crouton/auth: Update passkey not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Update passkey failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Check if WebAuthn is supported in the current browser
   */
  function isWebAuthnSupported(): boolean {
    if (typeof window === 'undefined') return false
    return (
      typeof PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials !== 'undefined'
    )
  }

  /**
   * Check if conditional UI (autofill) is available
   */
  async function isConditionalUIAvailable(): Promise<boolean> {
    if (!isWebAuthnSupported()) return false
    if (typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') {
      return false
    }
    try {
      return await PublicKeyCredential.isConditionalMediationAvailable()
    }
    catch {
      return false
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

    // Auth methods
    login,
    loginWithOAuth,
    loginWithPasskey,
    loginWithPasskeyAutofill,
    loginWithMagicLink,
    register,
    logout,
    forgotPassword,
    resetPassword,

    // Passkey management
    addPasskey,
    listPasskeys,
    deletePasskey,
    updatePasskey,

    // WebAuthn support helpers
    isWebAuthnSupported,
    isConditionalUIAvailable,
  }
}
