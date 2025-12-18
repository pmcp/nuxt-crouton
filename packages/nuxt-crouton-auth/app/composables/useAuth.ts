/**
 * useAuth Composable
 *
 * Main authentication composable providing reactive user state and auth methods.
 * Wraps Better Auth client functionality with type-safe methods.
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
import type { CroutonAuthConfig } from '../../types/config'

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

// ============================================================================
// Two-Factor Authentication Types
// ============================================================================

export interface TwoFactorStatus {
  /** Whether 2FA is enabled for the current user */
  enabled: boolean
  /** Whether TOTP is set up */
  hasTotp: boolean
  /** Whether backup codes have been generated */
  hasBackupCodes: boolean
}

export interface TotpSetupData {
  /** TOTP URI for QR code generation */
  totpURI: string
  /** Secret key for manual entry */
  secret: string
}

export interface VerifyTotpOptions {
  /** TOTP code from authenticator app */
  code: string
  /** Trust this device (skip 2FA for 30 days) */
  trustDevice?: boolean
}

export interface BackupCodeInfo {
  /** The backup code */
  code: string
  /** Whether this code has been used */
  used: boolean
}

/**
 * Get the Better Auth client from the plugin
 */
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}

export function useAuth() {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const authClient = useAuthClient()

  // Get reactive session from useSession composable
  const { user: sessionUser, isAuthenticated, isPending, error: sessionError, refresh, clear } = useSession()

  // Local state for loading/error during operations
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Reactive state from session
  const user = computed<User | null>(() => sessionUser.value)
  const loggedIn = computed(() => isAuthenticated.value)

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

  // ============================================================================
  // Auth Methods
  // ============================================================================

  /**
   * Sign in with email and password
   */
  async function login(credentials: LoginCredentials): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.signIn.email({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Login failed')
      }

      // Refresh session to update reactive state
      await refresh()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Login failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async function loginWithOAuth(provider: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.signIn.social({
        provider: provider as 'github' | 'google' | 'discord',
        callbackURL: window.location.origin + '/auth/callback',
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'OAuth login failed')
      }

      // OAuth redirects, so we don't need to refresh session here
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'OAuth login failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Sign in with passkey
   */
  async function loginWithPasskey(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!hasPasskeys.value) {
        throw new Error('Passkeys are not enabled')
      }

      const result = await authClient.signIn.passkey()

      if (result.error) {
        throw new Error(result.error.message ?? 'Passkey login failed')
      }

      // Refresh session to update reactive state
      await refresh()
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
      if (!hasPasskeys.value) {
        throw new Error('Passkeys are not enabled')
      }

      const result = await authClient.signIn.passkey({
        autoFill: true,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Passkey autofill failed')
      }

      // Refresh session to update reactive state
      await refresh()
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
   * Login with magic link
   */
  async function loginWithMagicLink(email: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!hasMagicLink.value) {
        throw new Error('Magic link is not enabled')
      }

      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: window.location.origin + '/auth/callback',
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Magic link failed')
      }

      // Magic link sends email, user clicks link to complete login
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Magic link failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Register a new user with email and password
   */
  async function register(data: RegisterData): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name ?? data.email.split('@')[0],
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Registration failed')
      }

      // Refresh session to update reactive state
      await refresh()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Registration failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Sign out the current user
   */
  async function logout(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await authClient.signOut()
      // Clear session state
      await clear()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Logout failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Request password reset email
   */
  async function forgotPassword(email: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.forgetPassword({
        email,
        redirectTo: window.location.origin + '/auth/reset-password',
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Request failed')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Request failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Reset password with token from email
   */
  async function resetPassword(token: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.resetPassword({
        token,
        newPassword: password,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Reset failed')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Reset failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  // ============================================================================
  // Passkey Management Methods
  // ============================================================================

  /**
   * Register a new passkey for the current user
   *
   * Requires user to be logged in.
   */
  async function addPasskey(options?: AddPasskeyOptions): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!hasPasskeys.value) {
        throw new Error('Passkeys are not enabled')
      }

      const result = await authClient.passkey.addPasskey({
        name: options?.name,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Add passkey failed')
      }
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
      if (!hasPasskeys.value) {
        return []
      }

      const result = await authClient.passkey.listUserPasskeys()

      if (result.error) {
        throw new Error(result.error.message ?? 'List passkeys failed')
      }

      return (result.data ?? []).map((p: { id: string, name?: string, createdAt: string | Date, credentialID: string }) => ({
        id: p.id,
        name: p.name ?? 'Passkey',
        createdAt: new Date(p.createdAt),
        credentialId: p.credentialID,
      }))
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
  async function deletePasskey(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!hasPasskeys.value) {
        throw new Error('Passkeys are not enabled')
      }

      const result = await authClient.passkey.deletePasskey({
        id,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Delete passkey failed')
      }
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
  async function updatePasskey(id: string, name: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!hasPasskeys.value) {
        throw new Error('Passkeys are not enabled')
      }

      // Better Auth doesn't have a direct update method, so we may need to delete and re-add
      // For now, we'll throw an error indicating this is not supported
      // TODO: Check if Better Auth supports passkey updates
      console.warn('[@crouton/auth] Passkey update not yet supported by Better Auth')
      throw new Error('Passkey update is not currently supported. Delete and re-add instead.')
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
    if (import.meta.server) return false
    return (
      typeof PublicKeyCredential !== 'undefined'
      && typeof navigator.credentials !== 'undefined'
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

  // ============================================================================
  // Two-Factor Authentication Methods
  // ============================================================================

  /**
   * Enable two-factor authentication for the current user
   *
   * This initiates the 2FA setup process. The user must:
   * 1. Call enable2FA() to start
   * 2. Use the returned TOTP URI to configure their authenticator app
   * 3. Call verifyTotp() with a code to complete setup
   *
   * @param password - Current password for verification
   * @returns TOTP setup data including QR code URI
   */
  async function enable2FA(password: string): Promise<TotpSetupData> {
    loading.value = true
    error.value = null
    try {
      if (!has2FA.value) {
        throw new Error('Two-factor authentication is not enabled')
      }

      const result = await authClient.twoFactor.enable({
        password,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Enable 2FA failed')
      }

      if (!result.data) {
        throw new Error('No data returned from enable 2FA')
      }

      return {
        totpURI: result.data.totpURI,
        secret: result.data.secret,
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Enable 2FA failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Disable two-factor authentication
   *
   * @param password - Current password for verification
   */
  async function disable2FA(password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!has2FA.value) {
        throw new Error('Two-factor authentication is not enabled')
      }

      const result = await authClient.twoFactor.disable({
        password,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Disable 2FA failed')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Disable 2FA failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Get the TOTP URI for QR code generation
   *
   * Use this to display a QR code for users to scan with their authenticator app.
   */
  async function getTotpUri(): Promise<string> {
    loading.value = true
    error.value = null
    try {
      if (!has2FA.value) {
        throw new Error('Two-factor authentication is not enabled')
      }

      const result = await authClient.twoFactor.getTOTPURI({})

      if (result.error) {
        throw new Error(result.error.message ?? 'Get TOTP URI failed')
      }

      return result.data?.totpURI ?? ''
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Get TOTP URI failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Verify a TOTP code during login or 2FA setup
   *
   * @param options - Verification options including the code
   * @returns True if verification succeeded
   */
  async function verifyTotp(options: VerifyTotpOptions): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      if (!has2FA.value) {
        throw new Error('Two-factor authentication is not enabled')
      }

      const result = await authClient.twoFactor.verifyTotp({
        code: options.code,
        trustDevice: options.trustDevice,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Verify TOTP failed')
      }

      // Refresh session after successful verification
      await refresh()

      return true
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Verify TOTP failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Generate new backup codes for account recovery
   *
   * This replaces any existing backup codes.
   *
   * @param password - Current password for verification
   * @returns Array of new backup codes
   */
  async function generateBackupCodes(password: string): Promise<string[]> {
    loading.value = true
    error.value = null
    try {
      if (!has2FA.value) {
        throw new Error('Two-factor authentication is not enabled')
      }

      const result = await authClient.twoFactor.generateBackupCodes({
        password,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Generate backup codes failed')
      }

      return result.data?.backupCodes ?? []
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Generate backup codes failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * View current backup codes
   *
   * Shows which codes have been used.
   *
   * @param password - Current password for verification
   * @returns Array of backup codes with usage status
   */
  async function viewBackupCodes(password: string): Promise<BackupCodeInfo[]> {
    loading.value = true
    error.value = null
    try {
      if (!has2FA.value) {
        throw new Error('Two-factor authentication is not enabled')
      }

      const result = await authClient.twoFactor.viewBackupCodes({
        password,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'View backup codes failed')
      }

      return (result.data?.backupCodes ?? []).map((c: { code: string, isUsed: boolean }) => ({
        code: c.code,
        used: c.isUsed,
      }))
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'View backup codes failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Verify a backup code for account recovery
   *
   * Used when user doesn't have access to their authenticator app.
   * Each backup code can only be used once.
   *
   * @param code - Backup code
   * @returns True if verification succeeded
   */
  async function verifyBackupCode(code: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      if (!has2FA.value) {
        throw new Error('Two-factor authentication is not enabled')
      }

      const result = await authClient.twoFactor.verifyBackupCode({
        code,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Verify backup code failed')
      }

      // Refresh session after successful verification
      await refresh()

      return true
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Verify backup code failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Get the current user's 2FA status
   */
  async function get2FAStatus(): Promise<TwoFactorStatus> {
    loading.value = true
    error.value = null
    try {
      if (!has2FA.value) {
        return {
          enabled: false,
          hasTotp: false,
          hasBackupCodes: false,
        }
      }

      // Better Auth stores 2FA status in user metadata
      // The user's twoFactorEnabled flag indicates status
      const userData = sessionUser.value
      if (!userData) {
        return {
          enabled: false,
          hasTotp: false,
          hasBackupCodes: false,
        }
      }

      // Check session data for 2FA status
      // This may need to be fetched from the API depending on Better Auth version
      const result = await authClient.getSession()

      const session = result.data
      const twoFactorEnabled = (session?.user as { twoFactorEnabled?: boolean })?.twoFactorEnabled ?? false

      return {
        enabled: twoFactorEnabled,
        hasTotp: twoFactorEnabled,
        hasBackupCodes: twoFactorEnabled, // Backup codes are generated when 2FA is enabled
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Get 2FA status failed'
      // Return default state on error
      return {
        enabled: false,
        hasTotp: false,
        hasBackupCodes: false,
      }
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

    // From session
    isPending,
    sessionError,

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

    // Session methods
    refreshSession: refresh,

    // Passkey management
    addPasskey,
    listPasskeys,
    deletePasskey,
    updatePasskey,

    // WebAuthn support helpers
    isWebAuthnSupported,
    isConditionalUIAvailable,

    // Two-Factor Authentication (2FA)
    enable2FA,
    disable2FA,
    getTotpUri,
    verifyTotp,
    generateBackupCodes,
    viewBackupCodes,
    verifyBackupCode,
    get2FAStatus,
  }
}
