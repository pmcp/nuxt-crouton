import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import type { Team, Member } from '../../../types'

// Import after mocks are set up
import {
  resolveTeamAndCheckMembership,
  getMembership,
  getTeamById,
  getTeamBySlug,
  getUserTeams,
  canUserCreateTeam,
  requireTeamRole,
  requireTeamAdmin,
  requireTeamOwner
} from '../../../server/utils/team'

// Mock H3Event
const createMockEvent = (overrides = {}): H3Event => ({
  node: { req: {}, res: {} },
  headers: new Headers({ cookie: 'session-token=test' }),
  context: {},
  ...overrides
}) as unknown as H3Event

// Mock session response
const createMockSessionResponse = (activeOrgId = 'team-1') => ({
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
    activeOrganizationId: activeOrgId,
    expiresAt: '2025-01-01T00:00:00.000Z'
  }
})

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

// Mock runtime config - can be overridden per test
let mockConfig = {
  public: {
    crouton: {
      auth: {
        mode: 'multi-tenant' as const,
        defaultTeamId: 'default',
        appName: 'Test App',
        teams: {
          allowCreate: true,
          limit: 5
        }
      }
    }
  }
}

// Setup global mocks
vi.stubGlobal('useRuntimeConfig', () => mockConfig)

vi.stubGlobal('createError', (options: { statusCode: number, message: string }) => {
  const error = new Error(options.message) as Error & { statusCode: number }
  error.statusCode = options.statusCode
  return error
})

vi.stubGlobal('getRouterParam', vi.fn((_event: H3Event, param: string) => {
  if (param === 'id') return 'team-1'
  return null
}))

// Mock hubDatabase for D1
const mockDbRun = vi.fn()
const mockDbAll = vi.fn()
vi.stubGlobal('hubDatabase', () => ({}))

// Mock drizzle
vi.mock('drizzle-orm/d1', () => ({
  drizzle: () => ({
    run: mockDbRun,
    all: mockDbAll
  })
}))

// Mock requireServerSession
const mockRequireServerSession = vi.fn()
vi.mock('../../../server/utils/useServerAuth', () => ({
  useServerAuth: () => mockAuthInstance,
  requireServerSession: (...args: unknown[]) => mockRequireServerSession(...args)
}))

describe('server/utils/team', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset config to defaults
    mockConfig = {
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
      }
    }
    // Reset mock implementations
    mockRequireServerSession.mockResolvedValue(createMockSessionResponse())
    mockAuthApi.getFullOrganization.mockResolvedValue({
      id: 'team-1',
      name: 'Test Team',
      slug: 'test-team',
      logo: null,
      metadata: null,
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
    mockAuthApi.listOrganizations.mockResolvedValue([
      { id: 'team-1', name: 'Team 1', slug: 'team-1', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'team-2', name: 'Team 2', slug: 'team-2', createdAt: '2024-01-01T00:00:00.000Z' }
    ])
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('resolveTeamAndCheckMembership', () => {
    describe('multi-tenant mode', () => {
      beforeEach(() => {
        mockConfig.public.crouton.auth.mode = 'multi-tenant'
      })

      it('should resolve team from URL param', async () => {
        const event = createMockEvent()
        const _context = await resolveTeamAndCheckMembership(event)

        expect(context.team).toBeDefined()
        expect(context.team.id).toBe('team-1')
        expect(context.user).toBeDefined()
        expect(context.membership).toBeDefined()
      })

      it('should fall back to session active org', async () => {
        vi.mocked(getRouterParam).mockReturnValue(null)
        mockRequireServerSession.mockResolvedValue(createMockSessionResponse('session-team'))
        mockAuthApi.getFullOrganization.mockResolvedValue({
          id: 'session-team',
          name: 'Session Team',
          slug: 'session-team',
          createdAt: '2024-01-01T00:00:00.000Z'
        })
        mockAuthApi.listMembers.mockResolvedValue({
          members: [{ id: 'member-1', userId: 'user-1', role: 'member', createdAt: '2024-01-01T00:00:00.000Z' }]
        })

        const event = createMockEvent()
        const _context = await resolveTeamAndCheckMembership(event)

        expect(context.team.id).toBe('session-team')
      })

      it('should throw 400 when no team context available', async () => {
        vi.mocked(getRouterParam).mockReturnValue(null)
        mockRequireServerSession.mockResolvedValue({
          ...createMockSessionResponse(),
          session: { id: 'session-1', userId: 'user-1', activeOrganizationId: null }
        })

        const event = createMockEvent()
        await expect(resolveTeamAndCheckMembership(event)).rejects.toThrow('No team context available')
      })
    })

    describe('single-tenant mode', () => {
      beforeEach(() => {
        mockConfig.public.crouton.auth.mode = 'single-tenant'
        mockConfig.public.crouton.auth.defaultTeamId = 'default-team'
        mockAuthApi.getFullOrganization.mockResolvedValue({
          id: 'default-team',
          name: 'Default Team',
          slug: 'default',
          isDefault: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        })
      })

      it('should always use default team', async () => {
        const event = createMockEvent()
        const _context = await resolveTeamAndCheckMembership(event)

        expect(context.team.id).toBe('default-team')
      })

      it('should ignore URL param', async () => {
        // Even with a different team ID in URL, should use default
        vi.mocked(getRouterParam).mockReturnValue('other-team')

        const event = createMockEvent()
        const _context = await resolveTeamAndCheckMembership(event)

        // Should still be default team
        expect(mockAuthApi.getFullOrganization).toHaveBeenCalledWith(
          expect.objectContaining({ query: { organizationId: 'default-team' } })
        )
      })
    })

    describe('personal mode', () => {
      beforeEach(() => {
        mockConfig.public.crouton.auth.mode = 'personal'
        mockAuthApi.getFullOrganization.mockResolvedValue({
          id: 'personal-user1',
          name: 'User\'s Workspace',
          slug: 'personal-user1',
          personal: true,
          ownerId: 'user-1',
          createdAt: '2024-01-01T00:00:00.000Z'
        })
        mockAuthApi.listMembers.mockResolvedValue({
          members: [{ id: 'member-1', userId: 'user-1', role: 'owner', createdAt: '2024-01-01T00:00:00.000Z' }]
        })
      })

      it('should use personal team from session', async () => {
        mockRequireServerSession.mockResolvedValue(createMockSessionResponse('personal-user1'))

        const event = createMockEvent()
        const _context = await resolveTeamAndCheckMembership(event)

        expect(context.team.id).toBe('personal-user1')
        expect(context.team.personal).toBe(true)
      })

      it('should ignore URL param', async () => {
        mockRequireServerSession.mockResolvedValue(createMockSessionResponse('personal-user1'))
        vi.mocked(getRouterParam).mockReturnValue('other-team')

        const event = createMockEvent()
        await resolveTeamAndCheckMembership(event)

        // Should still fetch personal team, not URL param
        expect(mockAuthApi.getFullOrganization).toHaveBeenCalledWith(
          expect.objectContaining({ query: { organizationId: 'personal-user1' } })
        )
      })
    })

    describe('error handling', () => {
      it('should throw 401 when not authenticated', async () => {
        mockRequireServerSession.mockRejectedValue(
          Object.assign(new Error('Unauthorized'), { statusCode: 401 })
        )

        const event = createMockEvent()
        await expect(resolveTeamAndCheckMembership(event)).rejects.toThrow('Unauthorized')
      })

      it('should throw 404 when team not found', async () => {
        mockAuthApi.getFullOrganization.mockResolvedValue(null)

        const event = createMockEvent()
        await expect(resolveTeamAndCheckMembership(event)).rejects.toThrow('Team not found')
      })

      it('should throw 403 when not a team member', async () => {
        mockAuthApi.listMembers.mockResolvedValue({ members: [] })

        const event = createMockEvent()
        await expect(resolveTeamAndCheckMembership(event)).rejects.toThrow('Not a team member')
      })
    })
  })

  describe('getMembership', () => {
    it('should return member when found', async () => {
      const event = createMockEvent()
      const member = await getMembership(event, 'team-1', 'user-1')

      expect(member).toBeDefined()
      expect(member?.userId).toBe('user-1')
      expect(member?.role).toBe('member')
    })

    it('should return null when member not found', async () => {
      mockAuthApi.listMembers.mockResolvedValue({ members: [] })

      const event = createMockEvent()
      const member = await getMembership(event, 'team-1', 'non-existent')

      expect(member).toBeNull()
    })

    it('should return null on API error', async () => {
      mockAuthApi.listMembers.mockRejectedValue(new Error('API error'))

      const event = createMockEvent()
      const member = await getMembership(event, 'team-1', 'user-1')

      expect(member).toBeNull()
    })

    it('should map role correctly', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'owner', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()
      const member = await getMembership(event, 'team-1', 'user-1')

      expect(member?.role).toBe('owner')
    })
  })

  describe('getTeamById', () => {
    it('should return team when found', async () => {
      const event = createMockEvent()
      const team = await getTeamById(event, 'team-1')

      expect(team).toBeDefined()
      expect(team?.id).toBe('team-1')
      expect(team?.name).toBe('Test Team')
    })

    it('should return null when team not found', async () => {
      mockAuthApi.getFullOrganization.mockResolvedValue(null)

      const event = createMockEvent()
      const team = await getTeamById(event, 'non-existent')

      expect(team).toBeNull()
    })

    it('should return null on API error', async () => {
      mockAuthApi.getFullOrganization.mockRejectedValue(new Error('API error'))

      const event = createMockEvent()
      const team = await getTeamById(event, 'team-1')

      expect(team).toBeNull()
    })

    it('should map personal flag correctly', async () => {
      mockAuthApi.getFullOrganization.mockResolvedValue({
        id: 'personal-1',
        name: 'Personal Workspace',
        slug: 'personal',
        personal: true,
        ownerId: 'user-1',
        createdAt: '2024-01-01T00:00:00.000Z'
      })

      const event = createMockEvent()
      const team = await getTeamById(event, 'personal-1')

      expect(team?.personal).toBe(true)
      expect(team?.ownerId).toBe('user-1')
    })

    it('should map isDefault flag correctly', async () => {
      mockAuthApi.getFullOrganization.mockResolvedValue({
        id: 'default',
        name: 'Default Workspace',
        slug: 'default',
        isDefault: true,
        createdAt: '2024-01-01T00:00:00.000Z'
      })

      const event = createMockEvent()
      const team = await getTeamById(event, 'default')

      expect(team?.isDefault).toBe(true)
    })

    it('should handle SQLite boolean values (0/1)', async () => {
      mockAuthApi.getFullOrganization.mockResolvedValue({
        id: 'team-1',
        name: 'Test Team',
        slug: 'test',
        personal: 1, // SQLite returns 1 for true
        isDefault: 0, // SQLite returns 0 for false
        createdAt: '2024-01-01T00:00:00.000Z'
      })

      const event = createMockEvent()
      const team = await getTeamById(event, 'team-1')

      expect(team?.personal).toBe(true)
      expect(team?.isDefault).toBe(false)
    })

    it('should fall back to metadata for legacy data', async () => {
      mockAuthApi.getFullOrganization.mockResolvedValue({
        id: 'team-1',
        name: 'Legacy Team',
        slug: 'legacy',
        metadata: JSON.stringify({ personal: true, ownerId: 'legacy-user' }),
        createdAt: '2024-01-01T00:00:00.000Z'
      })

      const event = createMockEvent()
      const team = await getTeamById(event, 'team-1')

      expect(team?.personal).toBe(true)
      expect(team?.ownerId).toBe('legacy-user')
    })
  })

  describe('getTeamBySlug', () => {
    it('should return team when found by slug', async () => {
      const event = createMockEvent()
      const team = await getTeamBySlug(event, 'test-team')

      expect(team).toBeDefined()
      expect(team?.slug).toBe('test-team')
    })

    it('should return null when team not found', async () => {
      mockAuthApi.getFullOrganization.mockResolvedValue(null)

      const event = createMockEvent()
      const team = await getTeamBySlug(event, 'non-existent')

      expect(team).toBeNull()
    })

    it('should call API with organizationSlug', async () => {
      const event = createMockEvent()
      await getTeamBySlug(event, 'my-team')

      expect(mockAuthApi.getFullOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { organizationSlug: 'my-team' }
        })
      )
    })
  })

  describe('getUserTeams', () => {
    it('should return list of teams', async () => {
      const event = createMockEvent()
      const teams = await getUserTeams(event)

      expect(teams).toHaveLength(2)
      expect(teams[0].id).toBe('team-1')
      expect(teams[1].id).toBe('team-2')
    })

    it('should return empty array when no teams', async () => {
      mockAuthApi.listOrganizations.mockResolvedValue([])

      const event = createMockEvent()
      const teams = await getUserTeams(event)

      expect(teams).toHaveLength(0)
    })

    it('should return empty array on API error', async () => {
      mockAuthApi.listOrganizations.mockRejectedValue(new Error('API error'))

      const event = createMockEvent()
      const teams = await getUserTeams(event)

      expect(teams).toHaveLength(0)
    })
  })

  describe('canUserCreateTeam', () => {
    it('should return true in multi-tenant mode when under limit', async () => {
      mockConfig.public.crouton.auth.mode = 'multi-tenant'
      mockConfig.public.crouton.auth.teams = { allowCreate: true, limit: 5 }
      mockAuthApi.listOrganizations.mockResolvedValue([
        { id: 'team-1', name: 'Team 1', slug: 'team-1', createdAt: '2024-01-01T00:00:00.000Z' }
      ])

      const event = createMockEvent()
      const canCreate = await canUserCreateTeam(event, 'user-1')

      expect(canCreate).toBe(true)
    })

    it('should return false when at limit', async () => {
      mockConfig.public.crouton.auth.mode = 'multi-tenant'
      mockConfig.public.crouton.auth.teams = { allowCreate: true, limit: 2 }
      mockAuthApi.listOrganizations.mockResolvedValue([
        { id: 'team-1', name: 'Team 1', slug: 'team-1', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'team-2', name: 'Team 2', slug: 'team-2', createdAt: '2024-01-01T00:00:00.000Z' }
      ])

      const event = createMockEvent()
      const canCreate = await canUserCreateTeam(event, 'user-1')

      expect(canCreate).toBe(false)
    })

    it('should return false when allowCreate is false', async () => {
      mockConfig.public.crouton.auth.mode = 'multi-tenant'
      mockConfig.public.crouton.auth.teams = { allowCreate: false, limit: 5 }

      const event = createMockEvent()
      const canCreate = await canUserCreateTeam(event, 'user-1')

      expect(canCreate).toBe(false)
    })

    it('should return false in single-tenant mode', async () => {
      mockConfig.public.crouton.auth.mode = 'single-tenant'

      const event = createMockEvent()
      const canCreate = await canUserCreateTeam(event, 'user-1')

      expect(canCreate).toBe(false)
    })

    it('should return false in personal mode', async () => {
      mockConfig.public.crouton.auth.mode = 'personal'

      const event = createMockEvent()
      const canCreate = await canUserCreateTeam(event, 'user-1')

      expect(canCreate).toBe(false)
    })
  })

  describe('requireTeamRole', () => {
    beforeEach(() => {
      mockAuthApi.getFullOrganization.mockResolvedValue({
        id: 'team-1',
        name: 'Test Team',
        slug: 'test-team',
        createdAt: '2024-01-01T00:00:00.000Z'
      })
    })

    it('should allow owner for any required role', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'owner', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()

      // Should pass for member requirement
      await expect(requireTeamRole(event, 'member')).resolves.toBeDefined()

      // Should pass for admin requirement
      await expect(requireTeamRole(event, 'admin')).resolves.toBeDefined()

      // Should pass for owner requirement
      await expect(requireTeamRole(event, 'owner')).resolves.toBeDefined()
    })

    it('should allow admin for member/admin roles', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'admin', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()

      // Should pass for member requirement
      await expect(requireTeamRole(event, 'member')).resolves.toBeDefined()

      // Should pass for admin requirement
      await expect(requireTeamRole(event, 'admin')).resolves.toBeDefined()

      // Should fail for owner requirement
      await expect(requireTeamRole(event, 'owner')).rejects.toThrow('Requires owner role or higher')
    })

    it('should allow member only for member role', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'member', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()

      // Should pass for member requirement
      await expect(requireTeamRole(event, 'member')).resolves.toBeDefined()

      // Should fail for admin requirement
      await expect(requireTeamRole(event, 'admin')).rejects.toThrow('Requires admin role or higher')

      // Should fail for owner requirement
      await expect(requireTeamRole(event, 'owner')).rejects.toThrow('Requires owner role or higher')
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

    it('should pass for admin role', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'admin', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()
      const context = await requireTeamAdmin(event)

      expect(context.membership.role).toBe('admin')
    })

    it('should pass for owner role', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'owner', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()
      const context = await requireTeamAdmin(event)

      expect(context.membership.role).toBe('owner')
    })

    it('should fail for member role', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'member', createdAt: '2024-01-01T00:00:00.000Z' }]
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

    it('should pass for owner role', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'owner', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()
      const context = await requireTeamOwner(event)

      expect(context.membership.role).toBe('owner')
    })

    it('should fail for admin role', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'admin', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()
      await expect(requireTeamOwner(event)).rejects.toThrow('Requires owner role or higher')
    })

    it('should fail for member role', async () => {
      mockAuthApi.listMembers.mockResolvedValue({
        members: [{ id: 'member-1', userId: 'user-1', role: 'member', createdAt: '2024-01-01T00:00:00.000Z' }]
      })

      const event = createMockEvent()
      await expect(requireTeamOwner(event)).rejects.toThrow('Requires owner role or higher')
    })
  })
})
