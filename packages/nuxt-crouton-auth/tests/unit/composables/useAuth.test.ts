import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, readonly } from 'vue'
import type { User } from '../../../types'

// Mock auth client
const mockAuthClient = {
  signIn: {
    email: vi.fn(),
    social: vi.fn(),
    passkey: vi.fn(),
    magicLink: vi.fn(),
  },
  signUp: {
    email: vi.fn(),
  },
  signOut: vi.fn(),
  forgetPassword: vi.fn(),
  resetPassword: vi.fn(),
  getSession: vi.fn(),
  passkey: {
    addPasskey: vi.fn(),
    listUserPasskeys: vi.fn(),
    deletePasskey: vi.fn(),
  },
  twoFactor: {
    enable: vi.fn(),
    disable: vi.fn(),
    getTOTPURI: vi.fn(),
    verifyTotp: vi.fn(),
    generateBackupCodes: vi.fn(),
    viewBackupCodes: vi.fn(),
    verifyBackupCode: vi.fn(),
  },
}

// Mock session state
const mockSessionUser = ref<User | null>(null)
const mockIsAuthenticated = ref(false)
const mockIsPending = computed(() => mockIsPendingValue.value)
const mockIsPendingValue = ref(false)
const mockSessionError = ref<Error | null>(null)
const mockRefresh = vi.fn()
const mockClear = vi.fn()

// Setup global mocks before importing the module
vi.stubGlobal('useNuxtApp', () => ({
  $authClient: mockAuthClient,
}))

vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    crouton: {
      auth: {
        mode: 'multi-tenant',
        methods: {
          password: true,
          oauth: {
            github: { clientId: 'test-github', clientSecret: 'test' },
            google: { clientId: 'test-google', clientSecret: 'test' },
          },
          passkeys: { enabled: true },
          twoFactor: { enabled: true },
          magicLink: { enabled: true },
        },
      },
    },
  },
}))

vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('readonly', readonly)

// Mock useSession as a global (since it's auto-imported in Nuxt)
vi.stubGlobal('useSession', () => ({
  user: mockSessionUser,
  isAuthenticated: mockIsAuthenticated,
  isPending: mockIsPending,
  error: mockSessionError,
  refresh: mockRefresh,
  clear: mockClear,
}))

// Import the composable after mocks are set up
import { useAuth } from '../../../app/composables/useAuth'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionUser.value = null
    mockIsAuthenticated.value = false
    mockIsPending.value = false
    mockSessionError.value = null
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('state', () => {
    it('should return null user when not authenticated', () => {
      const { user } = useAuth()
      expect(user.value).toBeNull()
    })

    it('should return user when authenticated', () => {
      const testUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockSessionUser.value = testUser
      mockIsAuthenticated.value = true

      const { user, loggedIn } = useAuth()
      expect(user.value).toEqual(testUser)
      expect(loggedIn.value).toBe(true)
    })

    it('should expose loading and error states', () => {
      const { loading, error } = useAuth()
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should expose isPending from session', () => {
      mockIsPendingValue.value = true
      const { isPending } = useAuth()
      expect(isPending.value).toBe(true)
    })
  })

  describe('capability flags', () => {
    it('should detect password auth enabled', () => {
      const { hasPassword } = useAuth()
      expect(hasPassword.value).toBe(true)
    })

    it('should detect OAuth enabled', () => {
      const { hasOAuth } = useAuth()
      expect(hasOAuth.value).toBe(true)
    })

    it('should list OAuth providers', () => {
      const { oauthProviders } = useAuth()
      expect(oauthProviders.value).toEqual(['github', 'google'])
    })

    it('should detect passkeys enabled', () => {
      const { hasPasskeys } = useAuth()
      expect(hasPasskeys.value).toBe(true)
    })

    it('should detect 2FA enabled', () => {
      const { has2FA } = useAuth()
      expect(has2FA.value).toBe(true)
    })

    it('should detect magic link enabled', () => {
      const { hasMagicLink } = useAuth()
      expect(hasMagicLink.value).toBe(true)
    })
  })

  describe('login', () => {
    it('should call signIn.email with credentials', async () => {
      mockAuthClient.signIn.email.mockResolvedValue({ data: { user: {} }, error: null })

      const { login } = useAuth()
      await login({ email: 'test@example.com', password: 'password123' })

      expect(mockAuthClient.signIn.email).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: undefined,
      })
      expect(mockRefresh).toHaveBeenCalled()
    })

    it('should handle rememberMe option', async () => {
      mockAuthClient.signIn.email.mockResolvedValue({ data: { user: {} }, error: null })

      const { login } = useAuth()
      await login({ email: 'test@example.com', password: 'password123', rememberMe: true })

      expect(mockAuthClient.signIn.email).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      })
    })

    it('should throw on login error', async () => {
      mockAuthClient.signIn.email.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      })

      const { login, error } = useAuth()

      await expect(login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials')
      expect(error.value).toBe('Invalid credentials')
    })

    it('should set loading state during login', async () => {
      let loadingDuringCall = false
      mockAuthClient.signIn.email.mockImplementation(async () => {
        // Check loading state during the async operation
        loadingDuringCall = true
        return { data: { user: {} }, error: null }
      })

      const { login, loading } = useAuth()
      const promise = login({ email: 'test@example.com', password: 'password123' })

      // Loading should be true while in progress
      expect(loading.value).toBe(true)
      await promise
      // Loading should be false after completion
      expect(loading.value).toBe(false)
    })
  })

  describe('loginWithOAuth', () => {
    it('should call signIn.social with provider', async () => {
      mockAuthClient.signIn.social.mockResolvedValue({ data: {}, error: null })

      const { loginWithOAuth } = useAuth()
      await loginWithOAuth('github')

      expect(mockAuthClient.signIn.social).toHaveBeenCalledWith({
        provider: 'github',
        callbackURL: 'http://localhost:3000/auth/callback',
      })
    })

    it('should throw on OAuth error', async () => {
      mockAuthClient.signIn.social.mockResolvedValue({
        data: null,
        error: { message: 'OAuth failed' },
      })

      const { loginWithOAuth, error } = useAuth()

      await expect(loginWithOAuth('github')).rejects.toThrow('OAuth failed')
      expect(error.value).toBe('OAuth failed')
    })
  })

  describe('loginWithPasskey', () => {
    it('should call signIn.passkey', async () => {
      mockAuthClient.signIn.passkey.mockResolvedValue({ data: { user: {} }, error: null })

      const { loginWithPasskey } = useAuth()
      await loginWithPasskey()

      expect(mockAuthClient.signIn.passkey).toHaveBeenCalled()
      expect(mockRefresh).toHaveBeenCalled()
    })

    it('should throw on passkey error', async () => {
      mockAuthClient.signIn.passkey.mockResolvedValue({
        data: null,
        error: { message: 'Passkey failed' },
      })

      const { loginWithPasskey, error } = useAuth()

      await expect(loginWithPasskey()).rejects.toThrow('Passkey failed')
      expect(error.value).toBe('Passkey failed')
    })
  })

  describe('loginWithPasskeyAutofill', () => {
    it('should call signIn.passkey with autoFill option', async () => {
      mockAuthClient.signIn.passkey.mockResolvedValue({ data: { user: {} }, error: null })

      const { loginWithPasskeyAutofill } = useAuth()
      await loginWithPasskeyAutofill()

      expect(mockAuthClient.signIn.passkey).toHaveBeenCalledWith({ autoFill: true })
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('loginWithMagicLink', () => {
    it('should call signIn.magicLink with email', async () => {
      mockAuthClient.signIn.magicLink.mockResolvedValue({ data: {}, error: null })

      const { loginWithMagicLink } = useAuth()
      await loginWithMagicLink('test@example.com')

      expect(mockAuthClient.signIn.magicLink).toHaveBeenCalledWith({
        email: 'test@example.com',
        callbackURL: 'http://localhost:3000/auth/callback',
      })
    })

    it('should throw on magic link error', async () => {
      mockAuthClient.signIn.magicLink.mockResolvedValue({
        data: null,
        error: { message: 'Magic link failed' },
      })

      const { loginWithMagicLink, error } = useAuth()

      await expect(loginWithMagicLink('test@example.com')).rejects.toThrow('Magic link failed')
      expect(error.value).toBe('Magic link failed')
    })
  })

  describe('register', () => {
    it('should call signUp.email with data', async () => {
      mockAuthClient.signUp.email.mockResolvedValue({ data: { user: {} }, error: null })

      const { register } = useAuth()
      await register({ email: 'new@example.com', password: 'password123', name: 'New User' })

      expect(mockAuthClient.signUp.email).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      })
      expect(mockRefresh).toHaveBeenCalled()
    })

    it('should use email prefix as name if not provided', async () => {
      mockAuthClient.signUp.email.mockResolvedValue({ data: { user: {} }, error: null })

      const { register } = useAuth()
      await register({ email: 'testuser@example.com', password: 'password123' })

      expect(mockAuthClient.signUp.email).toHaveBeenCalledWith({
        email: 'testuser@example.com',
        password: 'password123',
        name: 'testuser',
      })
    })

    it('should throw on registration error', async () => {
      mockAuthClient.signUp.email.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      })

      const { register, error } = useAuth()

      await expect(register({ email: 'existing@example.com', password: 'password123' }))
        .rejects.toThrow('Email already exists')
      expect(error.value).toBe('Email already exists')
    })
  })

  describe('logout', () => {
    it('should call signOut and clear session', async () => {
      mockAuthClient.signOut.mockResolvedValue({})

      const { logout } = useAuth()
      await logout()

      expect(mockAuthClient.signOut).toHaveBeenCalled()
      expect(mockClear).toHaveBeenCalled()
    })

    it('should throw on logout error', async () => {
      mockAuthClient.signOut.mockRejectedValue(new Error('Logout failed'))

      const { logout, error } = useAuth()

      await expect(logout()).rejects.toThrow('Logout failed')
      expect(error.value).toBe('Logout failed')
    })
  })

  describe('forgotPassword', () => {
    it('should call forgetPassword with email', async () => {
      mockAuthClient.forgetPassword.mockResolvedValue({ data: {}, error: null })

      const { forgotPassword } = useAuth()
      await forgotPassword('test@example.com')

      expect(mockAuthClient.forgetPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        redirectTo: 'http://localhost:3000/auth/reset-password',
      })
    })

    it('should throw on forgot password error', async () => {
      mockAuthClient.forgetPassword.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      })

      const { forgotPassword, error } = useAuth()

      await expect(forgotPassword('unknown@example.com')).rejects.toThrow('User not found')
      expect(error.value).toBe('User not found')
    })
  })

  describe('resetPassword', () => {
    it('should call resetPassword with token and new password', async () => {
      mockAuthClient.resetPassword.mockResolvedValue({ data: {}, error: null })

      const { resetPassword } = useAuth()
      await resetPassword('reset-token-123', 'newpassword123')

      expect(mockAuthClient.resetPassword).toHaveBeenCalledWith({
        token: 'reset-token-123',
        newPassword: 'newpassword123',
      })
    })

    it('should throw on reset password error', async () => {
      mockAuthClient.resetPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      })

      const { resetPassword, error } = useAuth()

      await expect(resetPassword('invalid-token', 'newpassword123'))
        .rejects.toThrow('Invalid token')
      expect(error.value).toBe('Invalid token')
    })
  })

  describe('passkey management', () => {
    describe('addPasskey', () => {
      it('should call passkey.addPasskey', async () => {
        mockAuthClient.passkey.addPasskey.mockResolvedValue({ data: {}, error: null })

        const { addPasskey } = useAuth()
        await addPasskey({ name: 'My Laptop' })

        expect(mockAuthClient.passkey.addPasskey).toHaveBeenCalledWith({
          name: 'My Laptop',
        })
      })

      it('should throw on add passkey error', async () => {
        mockAuthClient.passkey.addPasskey.mockResolvedValue({
          data: null,
          error: { message: 'Failed to add passkey' },
        })

        const { addPasskey, error } = useAuth()

        await expect(addPasskey()).rejects.toThrow('Failed to add passkey')
        expect(error.value).toBe('Failed to add passkey')
      })
    })

    describe('listPasskeys', () => {
      it('should return formatted passkey list', async () => {
        const mockPasskeys = [
          {
            id: 'pk-1',
            name: 'My Laptop',
            createdAt: '2024-01-01T00:00:00Z',
            credentialID: 'cred-123',
          },
          {
            id: 'pk-2',
            createdAt: '2024-01-02T00:00:00Z',
            credentialID: 'cred-456',
          },
        ]
        mockAuthClient.passkey.listUserPasskeys.mockResolvedValue({
          data: mockPasskeys,
          error: null,
        })

        const { listPasskeys } = useAuth()
        const passkeys = await listPasskeys()

        expect(passkeys).toHaveLength(2)
        expect(passkeys[0]).toMatchObject({
          id: 'pk-1',
          name: 'My Laptop',
          credentialId: 'cred-123',
        })
        expect(passkeys[0].createdAt).toBeInstanceOf(Date)
        expect(passkeys[1].name).toBe('Passkey') // Default name
      })
    })

    describe('deletePasskey', () => {
      it('should call passkey.deletePasskey with id', async () => {
        mockAuthClient.passkey.deletePasskey.mockResolvedValue({ data: {}, error: null })

        const { deletePasskey } = useAuth()
        await deletePasskey('pk-1')

        expect(mockAuthClient.passkey.deletePasskey).toHaveBeenCalledWith({ id: 'pk-1' })
      })
    })
  })

  describe('two-factor authentication', () => {
    describe('enable2FA', () => {
      it('should return TOTP setup data', async () => {
        mockAuthClient.twoFactor.enable.mockResolvedValue({
          data: {
            totpURI: 'otpauth://totp/App:user@example.com?secret=ABC123',
            secret: 'ABC123',
          },
          error: null,
        })

        const { enable2FA } = useAuth()
        const result = await enable2FA('password123')

        expect(mockAuthClient.twoFactor.enable).toHaveBeenCalledWith({ password: 'password123' })
        expect(result).toMatchObject({
          totpURI: 'otpauth://totp/App:user@example.com?secret=ABC123',
          secret: 'ABC123',
        })
      })

      it('should throw on enable 2FA error', async () => {
        mockAuthClient.twoFactor.enable.mockResolvedValue({
          data: null,
          error: { message: 'Invalid password' },
        })

        const { enable2FA, error } = useAuth()

        await expect(enable2FA('wrongpassword')).rejects.toThrow('Invalid password')
        expect(error.value).toBe('Invalid password')
      })
    })

    describe('disable2FA', () => {
      it('should call twoFactor.disable with password', async () => {
        mockAuthClient.twoFactor.disable.mockResolvedValue({ data: {}, error: null })

        const { disable2FA } = useAuth()
        await disable2FA('password123')

        expect(mockAuthClient.twoFactor.disable).toHaveBeenCalledWith({ password: 'password123' })
      })
    })

    describe('verifyTotp', () => {
      it('should verify TOTP code', async () => {
        mockAuthClient.twoFactor.verifyTotp.mockResolvedValue({ data: {}, error: null })

        const { verifyTotp } = useAuth()
        const result = await verifyTotp({ code: '123456' })

        expect(mockAuthClient.twoFactor.verifyTotp).toHaveBeenCalledWith({
          code: '123456',
          trustDevice: undefined,
        })
        expect(result).toBe(true)
        expect(mockRefresh).toHaveBeenCalled()
      })

      it('should support trust device option', async () => {
        mockAuthClient.twoFactor.verifyTotp.mockResolvedValue({ data: {}, error: null })

        const { verifyTotp } = useAuth()
        await verifyTotp({ code: '123456', trustDevice: true })

        expect(mockAuthClient.twoFactor.verifyTotp).toHaveBeenCalledWith({
          code: '123456',
          trustDevice: true,
        })
      })
    })

    describe('generateBackupCodes', () => {
      it('should return backup codes', async () => {
        const mockCodes = ['ABC123', 'DEF456', 'GHI789']
        mockAuthClient.twoFactor.generateBackupCodes.mockResolvedValue({
          data: { backupCodes: mockCodes },
          error: null,
        })

        const { generateBackupCodes } = useAuth()
        const codes = await generateBackupCodes('password123')

        expect(mockAuthClient.twoFactor.generateBackupCodes).toHaveBeenCalledWith({
          password: 'password123',
        })
        expect(codes).toEqual(mockCodes)
      })
    })

    describe('viewBackupCodes', () => {
      it('should return backup codes with usage status', async () => {
        const mockCodes = [
          { code: 'ABC123', isUsed: false },
          { code: 'DEF456', isUsed: true },
        ]
        mockAuthClient.twoFactor.viewBackupCodes.mockResolvedValue({
          data: { backupCodes: mockCodes },
          error: null,
        })

        const { viewBackupCodes } = useAuth()
        const codes = await viewBackupCodes('password123')

        expect(codes).toEqual([
          { code: 'ABC123', used: false },
          { code: 'DEF456', used: true },
        ])
      })
    })

    describe('verifyBackupCode', () => {
      it('should verify backup code', async () => {
        mockAuthClient.twoFactor.verifyBackupCode.mockResolvedValue({ data: {}, error: null })

        const { verifyBackupCode } = useAuth()
        const result = await verifyBackupCode('ABC123')

        expect(mockAuthClient.twoFactor.verifyBackupCode).toHaveBeenCalledWith({ code: 'ABC123' })
        expect(result).toBe(true)
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    describe('get2FAStatus', () => {
      it('should return 2FA status from session', async () => {
        mockSessionUser.value = {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test',
          image: null,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockAuthClient.getSession.mockResolvedValue({
          data: {
            user: { twoFactorEnabled: true },
          },
        })

        const { get2FAStatus } = useAuth()
        const status = await get2FAStatus()

        expect(status.enabled).toBe(true)
        expect(status.hasTotp).toBe(true)
        expect(status.hasBackupCodes).toBe(true)
      })

      it('should return disabled status when no user', async () => {
        mockSessionUser.value = null
        mockAuthClient.getSession.mockResolvedValue({ data: null })

        const { get2FAStatus } = useAuth()
        const status = await get2FAStatus()

        expect(status.enabled).toBe(false)
        expect(status.hasTotp).toBe(false)
        expect(status.hasBackupCodes).toBe(false)
      })
    })
  })

  describe('WebAuthn support helpers', () => {
    describe('isWebAuthnSupported', () => {
      it('should return true when WebAuthn is available', () => {
        const { isWebAuthnSupported } = useAuth()
        expect(isWebAuthnSupported()).toBe(true)
      })
    })

    describe('isConditionalUIAvailable', () => {
      it.skip('should check conditional mediation availability (requires browser environment)', async () => {
        // This test requires a real browser environment as PublicKeyCredential
        // mocking is complex due to the async static method nature
        const { isConditionalUIAvailable } = useAuth()
        const result = await isConditionalUIAvailable()
        expect(result).toBe(true)
      })
    })
  })

  describe('refreshSession', () => {
    it('should call session refresh', async () => {
      const { refreshSession } = useAuth()
      await refreshSession()
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
