import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import type { User, Team, Member } from '../../../types'

// Import after mocks are set up
import {
  requireAuth,
  getAuthUser,
  requireTeamMember,
  getTeamFromContext,
  setTeamContext
} from '../../../server/utils/auth'
import {
  requireTeamAdmin,
  requireTeamOwner
} from '../../../server/utils/team'
import { getServerSession, requireServerSession, useServerAuth } from '../../../server/utils/useServerAuth'

// Mock H3Event
const createMockEvent = (overrides = {}): H3Event => ({
  node: { req: {}, res: {} },
  headers: new Headers({ cookie: 'session-token=test' }),
  context: {},
  ...overrides
}) as unknown as H3Event

// Mock user data
const _mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

// Mock team data
const mockTeam: Team = {
  id: 'team-1',
  name: 'Test Team',
  slug: 'test-team',
  logo: null,
  metadata: {},
  personal: false,
  isDefault: false,
  ownerId: undefined,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

// Mock member data
const _mockMember: Member = {
  id: 'member-1',
  organizationId: 'team-1',
  userId: 'user-1',
  role: 'member',
  createdAt: new Date('2024-01-01')
}

// Mock session response
const mockSessionResponse = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  session: {
    id: 'session-1',
    userId: 'user-1',
    activeOrganizationId: 'team-1',
    expiresAt: '2025-01-01T00:00:00.000Z'
  }
}

// Mock Better Auth API
const mockAuthApi = {
  getSession: vi.fn(),
  listMembers: vi.fn(),
  getFullOrganization: vi.fn(),
  listOrganizations: vi.fn(),
  createOrganization: vi.fn(),
  setActiveOrganization: vi.fn()
}

// Mock auth instance
const mockAuthInstance = {
  api: mockAuthApi
}

// Setup global mocks
vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    crouton: {
      auth: {
        mode: 'multi-tenant',
        defaultTeamId: 'default',
        appName: 'Test App',
        teams: {
          allowCreate: true,
          limit: 5
        }
      }
    }
  },
  auth: {
    secret: 'test-secret',
    baseUrl: 'http://localhost:3000'
  }
}))

vi.stubGlobal('createError', (options: { statusCode: number, message: string }) => {
  const error = new Error(options.message) as Error & { statusCode: number }
  error.statusCode = options.statusCode
  return error
})

vi.stubGlobal('getRouterParam', (_event: H3Event, param: string) => {
  if (param === 'id') return 'team-1'
  return null
})

// Mock useServerAuth
vi.mock('../../../server/utils/useServerAuth', () => ({
  useServerAuth: vi.fn(() => mockAuthInstance),
  getServerSession: vi.fn(() => Promise.resolve(mockSessionResponse)),
  requireServerSession: vi.fn(async () => {
    if (!mockSessionResponse.user) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    return mockSessionResponse
  })
}))

// Mock hubDatabase for D1
vi.stubGlobal('hubDatabase', vi.fn())

describe('server/utils/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    vi.mocked(getServerSession).mockResolvedValue(mockSessionResponse)
    vi.mocked(requireServerSession).mockResolvedValue(mockSessionResponse)
    vi.mocked(useServerAuth).mockReturnValue(mockAuthInstance)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('requireAuth', () => {
    it('should return user when session exists', async () => {
      const event = createMockEvent()
      const user = await requireAuth(event)

      expect(user).toBeDefined()
      expect(user.id).toBe('user-1')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
    })

    it('should throw 401 when session is null', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const event = createMockEvent()
      await expect(requireAuth(event)).rejects.toThrow('Unauthorized')
    })

    it('should throw 401 when user is null in session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: null,
        session: { id: 'session-1' }
      })

      const event = createMockEvent()
      await expect(requireAuth(event)).rejects.toThrow('Unauthorized')
    })

    it('should map user fields correctly', async () => {
      const event = createMockEvent()
      const user = await requireAuth(event)

      expect(user.id).toBe('user-1')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.emailVerified).toBe(true)
      expect(user.image).toBeNull()
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('getAuthUser', () => {
    it('should return user when authenticated', async () => {
      const event = createMockEvent()
      const user = await getAuthUser(event)

      expect(user).toBeDefined()
      expect(user?.id).toBe('user-1')
    })

    it('should return null when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const event = createMockEvent()
      const user = await getAuthUser(event)

      expect(user).toBeNull()
    })

    it('should return null on error instead of throwing', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session error'))

      const event = createMockEvent()
      const user = await getAuthUser(event)

      expect(user).toBeNull()
    })
  })

  describe('getTeamFromContext', () => {
    it('should return team from event context', () => {
      const event = createMockEvent({ context: { team: mockTeam } })
      const team = getTeamFromContext(event)

      expect(team).toBeDefined()
      expect(team?.id).toBe('team-1')
      expect(team?.name).toBe('Test Team')
    })

    it('should return null when no team in context', () => {
      const event = createMockEvent({ context: {} })
      const team = getTeamFromContext(event)

      expect(team).toBeNull()
    })
  })

  describe('setTeamContext', () => {
    it('should set team in event context', () => {
      const event = createMockEvent({ context: {} })
      setTeamContext(event, mockTeam)

      expect(event.context.team).toBeDefined()
      expect(event.context.team.id).toBe('team-1')
    })
  })

  describe('requireTeamMember', () => {
    beforeEach(() => {
      // Mock successful team resolution
      mockAuthApi.getFullOrganization.mockResolvedValue({
        id: 'team-1',
        name: 'Test Team',
        slug: 'test-team',
        createdAt: '2024-01-01T00:00:00.000Z'
      })
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{
          id: 'member-1',
          userId: 'user-1',
          role: 'member',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      })
    })

    it('should return team context for valid member', async () => {
      const event = createMockEvent()
      const context = await requireTeamMember(event)

      expect(context.user).toBeDefined()
      expect(context.team).toBeDefined()
      expect(context.member).toBeDefined()
    })

    it('should throw 401 when not authenticated', async () => {
      vi.mocked(requireServerSession).mockRejectedValue(
        Object.assign(new Error('Unauthorized'), { statusCode: 401 })
      )

      const event = createMockEvent()
      await expect(requireTeamMember(event)).rejects.toThrow('Unauthorized')
    })

    it('should throw 403 when not a team member', async () => {
      mockAuthApi.listMembers.mockResolvedValue({ members: [] })

      const event = createMockEvent()
      await expect(requireTeamMember(event)).rejects.toThrow('Not a team member')
    })

    it('should throw 404 when team not found', async () => {
      mockAuthApi.getFullOrganization.mockResolvedValue(null)

      const event = createMockEvent()
      await expect(requireTeamMember(event)).rejects.toThrow('Team not found')
    })
  })

  describe('requireTeamAdmin', () => {
    beforeEach(() => {
      mockAuthApi.getFullOrganization.mockResolvedValue({
        id: 'team-1',
        name: 'Test Team',
        slug: 'test-team',
        createdAt: '2024-01-01T00:00:00.000Z'
      })
    })

    it('should return context for admin user', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{
          id: 'member-1',
          userId: 'user-1',
          role: 'admin',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      })

      const event = createMockEvent()
      const context = await requireTeamAdmin(event)

      expect(context.membership.role).toBe('admin')
    })

    it('should return context for owner user', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{
          id: 'member-1',
          userId: 'user-1',
          role: 'owner',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      })

      const event = createMockEvent()
      const context = await requireTeamAdmin(event)

      expect(context.membership.role).toBe('owner')
    })

    it('should throw 403 for regular member', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{
          id: 'member-1',
          userId: 'user-1',
          role: 'member',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      })

      const event = createMockEvent()
      await expect(requireTeamAdmin(event)).rejects.toThrow('Requires admin role or higher')
    })
  })

  describe('requireTeamOwner', () => {
    beforeEach(() => {
      mockAuthApi.getFullOrganization.mockResolvedValue({
        id: 'team-1',
        name: 'Test Team',
        slug: 'test-team',
        createdAt: '2024-01-01T00:00:00.000Z'
      })
    })

    it('should return context for owner user', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{
          id: 'member-1',
          userId: 'user-1',
          role: 'owner',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      })

      const event = createMockEvent()
      const context = await requireTeamOwner(event)

      expect(context.membership.role).toBe('owner')
    })

    it('should throw 403 for admin user', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{
          id: 'member-1',
          userId: 'user-1',
          role: 'admin',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      })

      const event = createMockEvent()
      await expect(requireTeamOwner(event)).rejects.toThrow('Requires owner role or higher')
    })

    it('should throw 403 for regular member', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{
          id: 'member-1',
          userId: 'user-1',
          role: 'member',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      })

      const event = createMockEvent()
      await expect(requireTeamOwner(event)).rejects.toThrow('Requires owner role or higher')
    })
  })
})
