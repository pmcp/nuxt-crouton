/**
 * Integration Test Setup
 *
 * This setup file provides mocks for integration testing auth flows.
 * Unlike unit tests that mock individual functions, integration tests
 * mock at the API layer to test complete flows.
 */
import { vi } from 'vitest'
import { ref, computed, reactive, readonly } from 'vue'

// ============================================================================
// Test Data Factories
// ============================================================================

export const createTestUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})

export const createTestTeam = (overrides = {}) => ({
  id: 'team-1',
  name: 'Test Team',
  slug: 'test-team',
  logo: null,
  metadata: {},
  personal: false,
  isDefault: false,
  ownerId: undefined,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})

export const createTestMember = (overrides = {}) => ({
  id: 'member-1',
  organizationId: 'team-1',
  userId: 'user-1',
  role: 'member' as const,
  createdAt: new Date('2024-01-01'),
  ...overrides
})

export const createTestSession = (overrides = {}) => ({
  id: 'session-1',
  userId: 'user-1',
  activeOrganizationId: 'team-1',
  expiresAt: new Date('2025-01-01'),
  ...overrides
})

export const createTestSubscription = (overrides = {}) => ({
  id: 'sub-1',
  organizationId: 'team-1',
  planId: 'pro',
  status: 'active' as const,
  currentPeriodStart: new Date('2024-01-01'),
  currentPeriodEnd: new Date('2024-02-01'),
  cancelAtPeriodEnd: false,
  ...overrides
})

// ============================================================================
// Mock Better Auth Client Factory
// ============================================================================

export interface MockAuthClientOptions {
  user?: ReturnType<typeof createTestUser> | null
  session?: ReturnType<typeof createTestSession> | null
  teams?: ReturnType<typeof createTestTeam>[]
  members?: ReturnType<typeof createTestMember>[]
  subscription?: ReturnType<typeof createTestSubscription> | null
}

export const createMockAuthClient = (options: MockAuthClientOptions = {}) => {
  const {
    user = null,
    session = null,
    teams = [],
    members = [],
    subscription = null
  } = options

  return {
    signIn: {
      email: vi.fn().mockImplementation(async (credentials) => {
        if (credentials.email === 'test@example.com' && credentials.password === 'password123') {
          return { data: { user: createTestUser() }, error: null }
        }
        return { data: null, error: { message: 'Invalid credentials' } }
      }),
      social: vi.fn().mockResolvedValue({ data: { url: 'https://oauth.example.com' }, error: null }),
      passkey: vi.fn().mockResolvedValue({ data: { user: createTestUser() }, error: null }),
      magicLink: vi.fn().mockResolvedValue({ data: {}, error: null })
    },
    signUp: {
      email: vi.fn().mockImplementation(async (data) => {
        if (data.email === 'existing@example.com') {
          return { data: null, error: { message: 'Email already exists' } }
        }
        return { data: { user: createTestUser({ ...data, id: 'new-user-id' }) }, error: null }
      })
    },
    signOut: vi.fn().mockResolvedValue({}),
    forgetPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    resetPassword: vi.fn().mockImplementation(async ({ token }) => {
      if (token === 'invalid-token') {
        return { data: null, error: { message: 'Invalid or expired token' } }
      }
      return { data: {}, error: null }
    }),
    getSession: vi.fn().mockImplementation(async () => {
      if (user && session) {
        return { data: { user, session }, error: null }
      }
      return { data: null, error: null }
    }),
    useSession: vi.fn().mockReturnValue({
      data: computed(() => user && session ? { user, session } : null),
      isPending: ref(false),
      error: ref(null)
    }),
    passkey: {
      addPasskey: vi.fn().mockResolvedValue({ data: { id: 'pk-1' }, error: null }),
      listUserPasskeys: vi.fn().mockResolvedValue({ data: [], error: null }),
      deletePasskey: vi.fn().mockResolvedValue({ data: {}, error: null })
    },
    twoFactor: {
      enable: vi.fn().mockResolvedValue({
        data: { totpURI: 'otpauth://totp/App:test@example.com?secret=ABC123', secret: 'ABC123' },
        error: null
      }),
      disable: vi.fn().mockResolvedValue({ data: {}, error: null }),
      getTOTPURI: vi.fn().mockResolvedValue({
        data: { totpURI: 'otpauth://totp/App:test@example.com?secret=ABC123' },
        error: null
      }),
      verifyTotp: vi.fn().mockImplementation(async ({ code }) => {
        if (code === '123456') {
          return { data: {}, error: null }
        }
        return { data: null, error: { message: 'Invalid code' } }
      }),
      generateBackupCodes: vi.fn().mockResolvedValue({
        data: { backupCodes: ['ABC123', 'DEF456', 'GHI789'] },
        error: null
      }),
      viewBackupCodes: vi.fn().mockResolvedValue({
        data: { backupCodes: [{ code: 'ABC123', isUsed: false }, { code: 'DEF456', isUsed: true }] },
        error: null
      }),
      verifyBackupCode: vi.fn().mockImplementation(async ({ code }) => {
        if (code === 'ABC123') {
          return { data: {}, error: null }
        }
        return { data: null, error: { message: 'Invalid backup code' } }
      })
    },
    organization: {
      // Better Auth client calls directly with data object, not wrapped in body
      create: vi.fn().mockImplementation(async (data) => {
        const team = createTestTeam({ ...data, id: 'new-team-id' })
        return { data: team, error: null }
      }),
      list: vi.fn().mockResolvedValue({ data: teams, error: null }),
      getFullOrganization: vi.fn().mockImplementation(async ({ query }) => {
        const found = teams.find(t => t.id === query?.organizationId || t.slug === query?.organizationSlug)
        return { data: found ?? null, error: null }
      }),
      setActive: vi.fn().mockResolvedValue({ data: {}, error: null }),
      update: vi.fn().mockImplementation(async (data) => {
        return { data: createTestTeam(data.data || data), error: null }
      }),
      delete: vi.fn().mockResolvedValue({ data: {}, error: null }),
      inviteMember: vi.fn().mockResolvedValue({ data: { id: 'inv-1' }, error: null }),
      removeMember: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateMemberRole: vi.fn().mockResolvedValue({ data: {}, error: null }),
      listMembers: vi.fn().mockResolvedValue({ data: { members }, error: null }),
      acceptInvitation: vi.fn().mockResolvedValue({ data: {}, error: null }),
      rejectInvitation: vi.fn().mockResolvedValue({ data: {}, error: null }),
      cancelInvitation: vi.fn().mockResolvedValue({ data: {}, error: null }),
      getInvitation: vi.fn().mockResolvedValue({ data: null, error: null }),
      listInvitations: vi.fn().mockResolvedValue({ data: [], error: null })
    },
    subscription: {
      list: vi.fn().mockResolvedValue({
        data: subscription ? [subscription] : [],
        error: null
      }),
      upgrade: vi.fn().mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/test' },
        error: null
      }),
      cancel: vi.fn().mockResolvedValue({ data: {}, error: null }),
      restore: vi.fn().mockResolvedValue({ data: {}, error: null })
    },
    // Reactive hooks for composables
    useListOrganizations: vi.fn().mockReturnValue({
      data: computed(() => teams),
      isPending: ref(false),
      error: ref(null)
    }),
    useActiveOrganization: vi.fn().mockReturnValue({
      data: computed(() => teams[0] ?? null),
      isPending: ref(false),
      error: ref(null)
    })
  }
}

// ============================================================================
// Mock Server Auth Factory
// ============================================================================

export interface MockServerAuthOptions {
  session?: { user: ReturnType<typeof createTestUser>, session: ReturnType<typeof createTestSession> } | null
  teams?: ReturnType<typeof createTestTeam>[]
  members?: ReturnType<typeof createTestMember>[]
}

export const createMockServerAuth = (options: MockServerAuthOptions = {}) => {
  const { session = null, teams = [], members = [] } = options

  return {
    api: {
      getSession: vi.fn().mockImplementation(async () => session),
      listOrganizations: vi.fn().mockResolvedValue(teams),
      getFullOrganization: vi.fn().mockImplementation(async ({ query }) => {
        return teams.find(t => t.id === query.organizationId || t.slug === query.organizationSlug) ?? null
      }),
      createOrganization: vi.fn().mockImplementation(async ({ body }) => {
        return createTestTeam({ ...body, id: 'new-team-id' })
      }),
      setActiveOrganization: vi.fn().mockResolvedValue({}),
      listMembers: vi.fn().mockResolvedValue({ members }),
      inviteMember: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      removeMember: vi.fn().mockResolvedValue({}),
      updateMemberRole: vi.fn().mockResolvedValue({})
    }
  }
}

// ============================================================================
// Mock H3 Event Factory
// ============================================================================

export const createMockEvent = (overrides = {}) => ({
  node: { req: {}, res: {} },
  headers: new Headers({ cookie: 'session-token=test' }),
  context: {},
  ...overrides
})

// ============================================================================
// Global Mock Setup
// ============================================================================

export const setupIntegrationMocks = (authClientOptions: MockAuthClientOptions = {}) => {
  const mockClient = createMockAuthClient(authClientOptions)

  vi.stubGlobal('useNuxtApp', () => ({
    $authClient: mockClient
  }))

  vi.stubGlobal('useRuntimeConfig', () => ({
    public: {
      crouton: {
        auth: {
          mode: 'multi-tenant',
          defaultTeamId: 'default',
          appName: 'Test App',
          methods: {
            password: true,
            oauth: {
              github: { clientId: 'test-github', clientSecret: 'test' },
              google: { clientId: 'test-google', clientSecret: 'test' }
            },
            passkeys: { enabled: true },
            twoFactor: { enabled: true },
            magicLink: { enabled: true }
          },
          teams: {
            allowCreate: true,
            limit: 5
          },
          billing: {
            enabled: true,
            stripe: {
              publishableKey: 'pk_test_mock',
              secretKey: 'sk_test_mock'
            },
            plans: [
              { id: 'free', name: 'Free', price: 0 },
              { id: 'pro', name: 'Pro', price: 29 }
            ]
          }
        }
      }
    },
    auth: {
      secret: 'test-secret',
      baseUrl: 'http://localhost:3000'
    }
  }))

  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('readonly', readonly)
  vi.stubGlobal('navigateTo', vi.fn())
  vi.stubGlobal('useRoute', () => ({
    params: {},
    path: '/dashboard',
    query: {}
  }))
  vi.stubGlobal('useRouter', () => ({
    push: vi.fn(),
    replace: vi.fn()
  }))
  vi.stubGlobal('useToast', () => ({
    add: vi.fn()
  }))
  vi.stubGlobal('createError', (options: { statusCode: number, message: string }) => {
    const error = new Error(options.message) as Error & { statusCode: number }
    error.statusCode = options.statusCode
    return error
  })
  vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue(null))

  // Mock useSession composable for useAuth
  const { user = null, session = null, teams = [] } = authClientOptions
  vi.stubGlobal('useSession', () => ({
    user: computed(() => user),
    session: computed(() => session),
    isAuthenticated: computed(() => !!user),
    isPending: ref(false),
    error: ref(null),
    refresh: vi.fn(),
    clear: vi.fn(),
    activeOrganization: computed(() => teams[0] ?? null)
  }))

  return mockClient
}
