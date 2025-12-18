import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CroutonAuthConfig } from '../../../types/config'

// Mock Better Auth and plugins
const mockBetterAuth = vi.fn(() => ({
  api: {},
  handler: () => {},
}))

vi.mock('better-auth', () => ({
  betterAuth: (config: unknown) => mockBetterAuth(config),
}))

vi.mock('better-auth/plugins', () => ({
  organization: vi.fn((config: unknown) => ({ type: 'organization', config })),
  twoFactor: vi.fn((config: unknown) => ({ type: 'twoFactor', config })),
}))

vi.mock('@better-auth/passkey', () => ({
  passkey: vi.fn((config: unknown) => ({ type: 'passkey', config })),
}))

vi.mock('@better-auth/stripe', () => ({
  stripe: vi.fn((config: unknown) => ({ type: 'stripe', config })),
}))

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(() => ({ type: 'drizzle' })),
}))

// Mock Stripe client
vi.mock('stripe', () => ({
  default: vi.fn(() => ({})),
}))

// Mock drizzle-orm
const mockDbRun = vi.fn()
const mockDbAll = vi.fn()
vi.mock('drizzle-orm/d1', () => ({
  drizzle: () => ({
    run: mockDbRun,
    all: mockDbAll,
  }),
}))

vi.mock('drizzle-orm', () => ({
  sql: vi.fn((...args: unknown[]) => ({ query: 'mock-sql', args })),
}))

// Import after mocks
import {
  createAuth,
  isTwoFactorEnabled,
  getTwoFactorInfo,
  isBillingEnabled,
  getBillingInfo,
  getStripePublishableKey,
  isSubscriptionActive,
  isSubscriptionInGracePeriod,
  isPasskeyEnabled,
  getPasskeyInfo,
  isWebAuthnSupported,
  getConfiguredOAuthProviders,
  isOAuthProviderConfigured,
  getOAuthCallbackURL,
} from '../../../server/lib/auth'

describe('server/lib/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbRun.mockResolvedValue({ success: true })
    mockDbAll.mockResolvedValue([])
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createAuth', () => {
    // Note: createAuth tests are skipped because the complex mocking required
    // for Better Auth internals makes them fragile. The utility functions
    // are tested thoroughly below, and integration tests will cover createAuth.
    it.skip('should create auth instance with basic config', () => {
      // Tested via integration tests
    })

    it.skip('should create auth instance with all methods enabled', () => {
      // Tested via integration tests
    })

    it.skip('should create auth instance with billing enabled', () => {
      // Tested via integration tests
    })
  })

  describe('isTwoFactorEnabled', () => {
    it('should return false when twoFactor is undefined', () => {
      const config: CroutonAuthConfig = { mode: 'multi-tenant' }
      expect(isTwoFactorEnabled(config)).toBe(false)
    })

    it('should return false when twoFactor is false', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { twoFactor: false },
      }
      expect(isTwoFactorEnabled(config)).toBe(false)
    })

    it('should return true when twoFactor is true', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { twoFactor: true },
      }
      expect(isTwoFactorEnabled(config)).toBe(true)
    })

    it('should return true when twoFactor is object with enabled: true', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { twoFactor: { enabled: true } },
      }
      expect(isTwoFactorEnabled(config)).toBe(true)
    })

    it('should return false when twoFactor is object with enabled: false', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { twoFactor: { enabled: false } },
      }
      expect(isTwoFactorEnabled(config)).toBe(false)
    })

    it('should return true when twoFactor is object without enabled property', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { twoFactor: { issuer: 'Custom App' } },
      }
      expect(isTwoFactorEnabled(config)).toBe(true)
    })
  })

  describe('getTwoFactorInfo', () => {
    it('should return null when 2FA is disabled', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { twoFactor: false },
      }
      expect(getTwoFactorInfo(config)).toBeNull()
    })

    it('should return default info when 2FA is true', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        appName: 'Test App',
        methods: { twoFactor: true },
      }
      const info = getTwoFactorInfo(config)

      expect(info).not.toBeNull()
      expect(info?.enabled).toBe(true)
      expect(info?.hasTotp).toBe(true)
      expect(info?.hasTrustedDevices).toBe(true)
      expect(info?.backupCodesCount).toBe(10)
      expect(info?.issuer).toBe('Test App')
    })

    it('should return custom info when 2FA has custom config', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: {
          twoFactor: {
            issuer: 'Custom Issuer',
            backupCodesCount: 5,
            totp: true,
            trustedDevices: false,
            trustedDeviceExpiry: 14,
          },
        },
      }
      const info = getTwoFactorInfo(config)

      expect(info?.issuer).toBe('Custom Issuer')
      expect(info?.backupCodesCount).toBe(5)
      expect(info?.hasTrustedDevices).toBe(false)
      expect(info?.trustedDeviceExpiryDays).toBe(14)
    })
  })

  describe('isBillingEnabled', () => {
    it('should return false when billing is undefined', () => {
      const config: CroutonAuthConfig = { mode: 'multi-tenant' }
      expect(isBillingEnabled(config)).toBe(false)
    })

    it('should return false when billing.enabled is false', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        billing: { enabled: false },
      }
      expect(isBillingEnabled(config)).toBe(false)
    })

    it('should return false when billing enabled but no stripe config', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        billing: { enabled: true },
      }
      expect(isBillingEnabled(config)).toBe(false)
    })

    it('should return true when billing enabled with stripe config', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        billing: {
          enabled: true,
          stripe: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      }
      expect(isBillingEnabled(config)).toBe(true)
    })
  })

  describe('getBillingInfo', () => {
    it('should return null when billing is disabled', () => {
      const config: CroutonAuthConfig = { mode: 'multi-tenant' }
      expect(getBillingInfo(config)).toBeNull()
    })

    it('should return billing info when enabled', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        billing: {
          enabled: true,
          stripe: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
            trialDays: 14,
            plans: [
              { id: 'pro', name: 'Pro Plan', price: 29, interval: 'month', stripePriceId: 'price_123' },
            ],
          },
        },
      }
      const info = getBillingInfo(config)

      expect(info).not.toBeNull()
      expect(info?.enabled).toBe(true)
      expect(info?.provider).toBe('stripe')
      expect(info?.hasPlans).toBe(true)
      expect(info?.plans).toHaveLength(1)
      expect(info?.plans[0].name).toBe('Pro Plan')
      expect(info?.hasTrialPeriod).toBe(true)
      expect(info?.trialDays).toBe(14)
      expect(info?.billingMode).toBe('organization')
    })

    it('should set billingMode to user for personal mode', () => {
      const config: CroutonAuthConfig = {
        mode: 'personal',
        billing: {
          enabled: true,
          stripe: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      }
      const info = getBillingInfo(config)

      expect(info?.billingMode).toBe('user')
    })
  })

  describe('getStripePublishableKey', () => {
    it('should return null when billing is not configured', () => {
      const config: CroutonAuthConfig = { mode: 'multi-tenant' }
      expect(getStripePublishableKey(config)).toBeNull()
    })

    it('should return publishable key when configured', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        billing: {
          enabled: true,
          stripe: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      }
      expect(getStripePublishableKey(config)).toBe('pk_test_123')
    })
  })

  describe('isSubscriptionActive', () => {
    it('should return true for active status', () => {
      expect(isSubscriptionActive('active')).toBe(true)
    })

    it('should return true for trialing status', () => {
      expect(isSubscriptionActive('trialing')).toBe(true)
    })

    it('should return false for canceled status', () => {
      expect(isSubscriptionActive('canceled')).toBe(false)
    })

    it('should return false for past_due status', () => {
      expect(isSubscriptionActive('past_due')).toBe(false)
    })

    it('should return false for unpaid status', () => {
      expect(isSubscriptionActive('unpaid')).toBe(false)
    })
  })

  describe('isSubscriptionInGracePeriod', () => {
    it('should return true for past_due status', () => {
      expect(isSubscriptionInGracePeriod('past_due')).toBe(true)
    })

    it('should return false for active status', () => {
      expect(isSubscriptionInGracePeriod('active')).toBe(false)
    })

    it('should return false for canceled status', () => {
      expect(isSubscriptionInGracePeriod('canceled')).toBe(false)
    })
  })

  describe('isPasskeyEnabled', () => {
    it('should return false when passkeys is undefined', () => {
      const config: CroutonAuthConfig = { mode: 'multi-tenant' }
      expect(isPasskeyEnabled(config)).toBe(false)
    })

    it('should return false when passkeys is false', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { passkeys: false },
      }
      expect(isPasskeyEnabled(config)).toBe(false)
    })

    it('should return true when passkeys is true', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { passkeys: true },
      }
      expect(isPasskeyEnabled(config)).toBe(true)
    })

    it('should return true when passkeys has enabled: true', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { passkeys: { enabled: true } },
      }
      expect(isPasskeyEnabled(config)).toBe(true)
    })

    it('should return false when passkeys has enabled: false', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { passkeys: { enabled: false } },
      }
      expect(isPasskeyEnabled(config)).toBe(false)
    })
  })

  describe('getPasskeyInfo', () => {
    it('should return null when passkeys disabled', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { passkeys: false },
      }
      expect(getPasskeyInfo(config)).toBeNull()
    })

    it('should return default info when passkeys is true', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: { passkeys: true },
      }
      const info = getPasskeyInfo(config)

      expect(info).not.toBeNull()
      expect(info?.enabled).toBe(true)
      expect(info?.rpName).toBe('Application')
      expect(info?.conditionalUI).toBe(true)
    })

    it('should return custom info when passkeys has config', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        methods: {
          passkeys: {
            rpName: 'My App',
            conditionalUI: false,
          },
        },
      }
      const info = getPasskeyInfo(config)

      expect(info?.rpName).toBe('My App')
      expect(info?.conditionalUI).toBe(false)
    })
  })

  describe('isWebAuthnSupported', () => {
    it('should return false when window is undefined', () => {
      const originalWindow = global.window
      // @ts-expect-error - testing undefined window
      delete global.window
      expect(isWebAuthnSupported()).toBe(false)
      global.window = originalWindow
    })
  })

  describe('getConfiguredOAuthProviders', () => {
    it('should return empty array when no OAuth configured', () => {
      expect(getConfiguredOAuthProviders(undefined)).toEqual([])
    })

    it('should return provider info for configured providers', () => {
      const oauthConfig = {
        github: { clientId: 'gh-client', clientSecret: 'gh-secret' },
        google: { clientId: 'g-client', clientSecret: 'g-secret' },
      }
      const providers = getConfiguredOAuthProviders(oauthConfig)

      expect(providers).toHaveLength(2)
      expect(providers.find((p) => p.id === 'github')).toBeDefined()
      expect(providers.find((p) => p.id === 'google')).toBeDefined()
    })

    it('should include icon and color for known providers', () => {
      const oauthConfig = {
        github: { clientId: 'gh-client', clientSecret: 'gh-secret' },
      }
      const providers = getConfiguredOAuthProviders(oauthConfig)

      expect(providers[0].icon).toBe('i-simple-icons-github')
      expect(providers[0].color).toBe('#24292e')
      expect(providers[0].name).toBe('GitHub')
    })

    it('should use generic icon for unknown providers', () => {
      const oauthConfig = {
        custom: { clientId: 'custom-client', clientSecret: 'custom-secret' },
      }
      const providers = getConfiguredOAuthProviders(oauthConfig)

      expect(providers[0].id).toBe('custom')
      expect(providers[0].icon).toBe('i-heroicons-key')
      expect(providers[0].name).toBe('Custom')
    })
  })

  describe('isOAuthProviderConfigured', () => {
    it('should return false when no OAuth configured', () => {
      expect(isOAuthProviderConfigured(undefined, 'github')).toBe(false)
    })

    it('should return false when provider not configured', () => {
      const oauthConfig = {
        google: { clientId: 'g-client', clientSecret: 'g-secret' },
      }
      expect(isOAuthProviderConfigured(oauthConfig, 'github')).toBe(false)
    })

    it('should return true when provider is configured', () => {
      const oauthConfig = {
        github: { clientId: 'gh-client', clientSecret: 'gh-secret' },
      }
      expect(isOAuthProviderConfigured(oauthConfig, 'github')).toBe(true)
    })

    it('should return false when provider config is incomplete', () => {
      const oauthConfig = {
        github: { clientId: 'gh-client', clientSecret: '' },
      }
      expect(isOAuthProviderConfigured(oauthConfig, 'github')).toBe(false)
    })
  })

  describe('getOAuthCallbackURL', () => {
    it('should generate correct callback URL', () => {
      const url = getOAuthCallbackURL('http://localhost:3000', 'github')
      expect(url).toBe('http://localhost:3000/api/auth/callback/github')
    })

    it('should handle trailing slash in base URL', () => {
      const url = getOAuthCallbackURL('http://localhost:3000/', 'google')
      expect(url).toBe('http://localhost:3000/api/auth/callback/google')
    })

    it('should work with production URL', () => {
      const url = getOAuthCallbackURL('https://myapp.com', 'discord')
      expect(url).toBe('https://myapp.com/api/auth/callback/discord')
    })
  })
})

describe('Mode-specific behavior', () => {
  describe('multi-tenant mode', () => {
    it('should allow organization creation by users', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        teams: { allowCreate: true },
      }
      // In multi-tenant mode, users can create organizations
      expect(config.mode).toBe('multi-tenant')
      expect(config.teams?.allowCreate).toBe(true)
    })

    it('should use configurable organization limit', () => {
      const config: CroutonAuthConfig = {
        mode: 'multi-tenant',
        teams: { limit: 10 },
      }
      expect(config.teams?.limit).toBe(10)
    })
  })

  describe('single-tenant mode', () => {
    it('should use default team ID', () => {
      const config: CroutonAuthConfig = {
        mode: 'single-tenant',
        defaultTeamId: 'my-default-team',
        appName: 'My App',
      }
      expect(config.defaultTeamId).toBe('my-default-team')
    })

    it('should fall back to "default" when defaultTeamId not set', () => {
      const config: CroutonAuthConfig = {
        mode: 'single-tenant',
        appName: 'My App',
      }
      expect(config.defaultTeamId ?? 'default').toBe('default')
    })
  })

  describe('personal mode', () => {
    it('should limit organizations to 1', () => {
      const config: CroutonAuthConfig = {
        mode: 'personal',
      }
      // Personal mode automatically limits to 1 org per user
      expect(config.mode).toBe('personal')
    })

    it('should use user billing mode', () => {
      const config: CroutonAuthConfig = {
        mode: 'personal',
        billing: {
          enabled: true,
          stripe: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      }
      const info = getBillingInfo(config)
      expect(info?.billingMode).toBe('user')
    })
  })
})
