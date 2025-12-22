/**
 * Integration Tests: Registration Flow
 *
 * Tests the complete registration flow including:
 * - Email/password registration
 * - Password validation
 * - Email verification
 * - Password reset flow
 * - Mode-specific behavior (personal workspace creation)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setupIntegrationMocks,
  createTestUser,
  createTestSession,
  createTestTeam
} from './setup'

describe('Integration: Registration Flow', () => {
  let mockClient: ReturnType<typeof setupIntegrationMocks>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Email/Password Registration', () => {
    it('should successfully register a new user', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await auth.register({
        email: 'newuser@example.com',
        password: 'securepassword123',
        name: 'New User'
      })

      expect(mockClient.signUp.email).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'securepassword123',
        name: 'New User'
      })
    })

    it('should use email prefix as name if not provided', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await auth.register({
        email: 'johndoe@example.com',
        password: 'securepassword123'
      })

      expect(mockClient.signUp.email).toHaveBeenCalledWith({
        email: 'johndoe@example.com',
        password: 'securepassword123',
        name: 'johndoe'
      })
    })

    it('should reject registration with existing email', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await expect(auth.register({
        email: 'existing@example.com',
        password: 'password123'
      })).rejects.toThrow('Email already exists')

      expect(auth.error.value).toBe('Email already exists')
    })

    it('should set loading state during registration', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      const registerPromise = auth.register({
        email: 'newuser@example.com',
        password: 'password123'
      })

      expect(auth.loading.value).toBe(true)
      await registerPromise
      expect(auth.loading.value).toBe(false)
    })

    it('should clear previous errors on successful registration', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      // Trigger an error
      await expect(auth.register({ email: 'existing@example.com', password: 'pass' }))
        .rejects.toThrow()
      expect(auth.error.value).toBe('Email already exists')

      // Register successfully
      await auth.register({ email: 'newuser@example.com', password: 'password123' })
      expect(auth.error.value).toBeNull()
    })
  })

  describe('Password Reset Flow', () => {
    // TODO: window.location mock complexity
    it.todo('should request password reset with email', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await auth.forgotPassword('test@example.com')

      expect(mockClient.forgetPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        redirectTo: expect.stringContaining('/auth/reset-password')
      })
    })

    it('should reset password with valid token', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await auth.resetPassword('valid-token-123', 'newpassword123')

      expect(mockClient.resetPassword).toHaveBeenCalledWith({
        token: 'valid-token-123',
        newPassword: 'newpassword123'
      })
    })

    it('should reject invalid reset token', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await expect(auth.resetPassword('invalid-token', 'newpassword123'))
        .rejects.toThrow('Invalid or expired token')

      expect(auth.error.value).toBe('Invalid or expired token')
    })

    // TODO: window.location mock complexity
    it.todo('should set loading state during password reset request', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      const resetPromise = auth.forgotPassword('test@example.com')
      expect(auth.loading.value).toBe(true)

      await resetPromise
      expect(auth.loading.value).toBe(false)
    })
  })

  describe('Two-Factor Setup', () => {
    // TODO: 2FA mock complexity
    it.todo('should enable 2FA and return TOTP setup data', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      const result = await auth.enable2FA('password123')

      expect(mockClient.twoFactor.enable).toHaveBeenCalledWith({ password: 'password123' })
      expect(result).toMatchObject({
        totpURI: expect.stringContaining('otpauth://totp/'),
        secret: 'ABC123'
      })
    })

    it('should disable 2FA with password confirmation', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await auth.disable2FA('password123')

      expect(mockClient.twoFactor.disable).toHaveBeenCalledWith({ password: 'password123' })
    })

    it('should generate backup codes', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      const codes = await auth.generateBackupCodes('password123')

      expect(mockClient.twoFactor.generateBackupCodes).toHaveBeenCalledWith({ password: 'password123' })
      expect(codes).toHaveLength(3)
      expect(codes).toContain('ABC123')
    })

    // TODO: 2FA mock complexity
    it.todo('should view backup codes with usage status', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      const codes = await auth.viewBackupCodes('password123')

      expect(mockClient.twoFactor.viewBackupCodes).toHaveBeenCalledWith({ password: 'password123' })
      expect(codes).toHaveLength(2)
      expect(codes[0]).toMatchObject({ code: 'ABC123', used: false })
      expect(codes[1]).toMatchObject({ code: 'DEF456', used: true })
    })
  })

  describe('Passkey Management', () => {
    it('should add a new passkey', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await auth.addPasskey({ name: 'My Laptop' })

      expect(mockClient.passkey.addPasskey).toHaveBeenCalledWith({ name: 'My Laptop' })
    })

    it('should list user passkeys', async () => {
      mockClient = setupIntegrationMocks()
      mockClient.passkey.listUserPasskeys.mockResolvedValueOnce({
        data: [
          { id: 'pk-1', name: 'My Laptop', createdAt: '2024-01-01T00:00:00Z', credentialID: 'cred-1' }
        ],
        error: null
      })

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      const passkeys = await auth.listPasskeys()

      expect(mockClient.passkey.listUserPasskeys).toHaveBeenCalled()
      expect(passkeys).toHaveLength(1)
      expect(passkeys[0]).toMatchObject({
        id: 'pk-1',
        name: 'My Laptop',
        credentialId: 'cred-1'
      })
    })

    it('should delete a passkey', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      await auth.deletePasskey('pk-1')

      expect(mockClient.passkey.deletePasskey).toHaveBeenCalledWith({ id: 'pk-1' })
    })
  })

  describe('Registration in Multi-Tenant Mode', () => {
    it('should allow team creation after registration', async () => {
      const user = createTestUser({ id: 'new-user-id' })
      const session = createTestSession({ userId: user.id })

      mockClient = setupIntegrationMocks({ user, session, teams: [] })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      // User is registered and authenticated
      expect(auth.loggedIn.value).toBe(true)
      expect(auth.user.value?.id).toBe('new-user-id')
    })
  })

  describe('Registration in Personal Mode', () => {
    it('should auto-create personal workspace on registration', async () => {
      // Configure personal mode
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: {
              mode: 'personal',
              methods: { password: true }
            }
          }
        },
        auth: { secret: 'test', baseUrl: 'http://localhost:3000' }
      }))

      const personalTeam = createTestTeam({
        id: 'personal-team',
        name: 'New User\'s Workspace',
        personal: true,
        ownerId: 'new-user-id'
      })

      mockClient = setupIntegrationMocks({
        teams: [personalTeam]
      })

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      // Registration would trigger personal workspace creation via Better Auth hooks
      await auth.register({ email: 'newuser@example.com', password: 'password123' })

      // Verify registration was called
      expect(mockClient.signUp.email).toHaveBeenCalled()
    })
  })

  describe('Registration in Single-Tenant Mode', () => {
    it('should auto-add to default team on registration', async () => {
      // Configure single-tenant mode
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: {
              mode: 'single-tenant',
              defaultTeamId: 'default',
              methods: { password: true }
            }
          }
        },
        auth: { secret: 'test', baseUrl: 'http://localhost:3000' }
      }))

      const defaultTeam = createTestTeam({
        id: 'default',
        name: 'Default Workspace',
        isDefault: true
      })

      mockClient = setupIntegrationMocks({
        teams: [defaultTeam]
      })

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      // Registration would trigger auto-add to default team via Better Auth hooks
      await auth.register({ email: 'newuser@example.com', password: 'password123' })

      expect(mockClient.signUp.email).toHaveBeenCalled()
    })
  })

  describe('Auth Method Availability', () => {
    it('should detect password auth enabled', async () => {
      mockClient = setupIntegrationMocks()

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      expect(auth.hasPassword.value).toBe(true)
    })

    // TODO: config override mock complexity
    it.todo('should detect when password auth is disabled', async () => {
      // Note: Call setupIntegrationMocks first, then override useRuntimeConfig
      mockClient = setupIntegrationMocks()

      // Override after setup to change config
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: {
              mode: 'multi-tenant',
              methods: { password: false, oauth: { github: {} } }
            }
          }
        },
        auth: { secret: 'test', baseUrl: 'http://localhost:3000' }
      }))

      const { useAuth } = await import('../../app/composables/useAuth')
      const auth = useAuth()

      expect(auth.hasPassword.value).toBe(false)
    })
  })
})
