/**
 * API Test Setup
 *
 * Provides mocks and factories for testing collection API handlers.
 * Tests the patterns used by generated collection endpoints.
 */
import { vi } from 'vitest'
import type { H3Event } from 'h3'

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

export const createTestCollectionItem = (overrides: Record<string, any> = {}) => ({
  id: 'item-1',
  teamId: 'team-1',
  owner: 'user-1',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  title: 'Test Item',
  description: 'Test description',
  translations: {} as Record<string, Record<string, string>>,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})

// ============================================================================
// Mock H3 Event Factory
// ============================================================================

export interface MockEventOptions {
  params?: Record<string, string>
  query?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
}

export const createMockEvent = (options: MockEventOptions = {}): H3Event => {
  const { params = {}, query = {}, body, headers = {} } = options

  return {
    node: { req: {}, res: {} },
    headers: new Headers({
      cookie: 'session-token=test',
      ...headers
    }),
    context: {
      params: { id: 'team-1', ...params }
    },
    _body: body,
    _query: query,
    ...options
  } as unknown as H3Event
}

// ============================================================================
// Mock Database Factory
// ============================================================================

export interface MockDatabaseOptions {
  items?: ReturnType<typeof createTestCollectionItem>[]
}

export const createMockDatabase = (options: MockDatabaseOptions = {}) => {
  const { items = [createTestCollectionItem()] } = options

  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(items),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([items[0]]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis()
  }
}

// ============================================================================
// Mock Auth Factory
// ============================================================================

export interface MockAuthOptions {
  user?: ReturnType<typeof createTestUser> | null
  team?: ReturnType<typeof createTestTeam> | null
  member?: ReturnType<typeof createTestMember> | null
  shouldThrow?: { statusCode: number; message: string } | null
}

export const createMockResolveTeamAndCheckMembership = (options: MockAuthOptions = {}) => {
  const {
    user = createTestUser(),
    team = createTestTeam(),
    member = createTestMember(),
    shouldThrow = null
  } = options

  return vi.fn().mockImplementation(async () => {
    if (shouldThrow) {
      const error = new Error(shouldThrow.message) as Error & { statusCode: number }
      error.statusCode = shouldThrow.statusCode
      throw error
    }
    return { user, team, member }
  })
}

// ============================================================================
// Global Mock Setup
// ============================================================================

export interface SetupApiMocksOptions {
  auth?: MockAuthOptions
  database?: MockDatabaseOptions
}

export const setupApiMocks = (options: SetupApiMocksOptions = {}) => {
  const { auth = {}, database = {} } = options

  const mockResolveTeam = createMockResolveTeamAndCheckMembership(auth)
  const mockDb = createMockDatabase(database)

  // Mock global functions
  vi.stubGlobal('useDB', () => mockDb)
  vi.stubGlobal('getQuery', (_event: H3Event) => (_event as any)._query || {})
  vi.stubGlobal('readBody', async (_event: H3Event) => (_event as any)._body || {})
  vi.stubGlobal('getRouterParam', (_event: H3Event, param: string) => {
    const params = (_event as any).context?.params || {}
    return params[param] || null
  })
  vi.stubGlobal('createError', (opts: { statusCode: number; statusMessage: string }) => {
    const error = new Error(opts.statusMessage) as Error & { statusCode: number }
    error.statusCode = opts.statusCode
    return error
  })
  vi.stubGlobal('defineEventHandler', (handler: (event: H3Event) => unknown) => handler)

  return {
    mockResolveTeam,
    mockDb,
    cleanup: () => {
      vi.unstubAllGlobals()
      vi.clearAllMocks()
    }
  }
}
