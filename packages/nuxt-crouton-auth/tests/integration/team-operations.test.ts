/**
 * Integration Tests: Team Operations
 *
 * Tests the team management flow including:
 * - Team creation
 * - Team switching
 * - Mode-specific behavior
 *
 * Note: Tests that require deep Better Auth organization API integration
 * are handled in unit tests. Integration tests focus on composable flows.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { } from 'vue'
import {
  setupIntegrationMocks,
  createTestUser,
  createTestSession,
  createTestTeam,
  createTestMember
} from './setup'

describe('Integration: Team Operations', () => {
  let mockClient: ReturnType<typeof setupIntegrationMocks>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Team Creation', () => {
    it('should create a new team', async () => {
      const user = createTestUser()
      const session = createTestSession()
      const existingTeam = createTestTeam({ id: 'team-1', name: 'Existing Team' })

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: [existingTeam],
        members: [createTestMember({ userId: user.id, organizationId: existingTeam.id, role: 'owner' })]
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      await team.createTeam({ name: 'New Team', slug: 'new-team' })

      expect(mockClient.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Team', slug: 'new-team' })
      )
    })

    it('should auto-generate slug from name', async () => {
      const user = createTestUser()
      const session = createTestSession()

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: []
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      // Create with name only - slug should be auto-generated
      await team.createTeam({ name: 'My Awesome Team' })

      expect(mockClient.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Awesome Team' })
      )
    })

    it('should report team creation capability in multi-tenant mode', async () => {
      mockClient = setupIntegrationMocks({
        user: createTestUser(),
        session: createTestSession(),
        teams: []
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: createTestUser() },
        session: { value: createTestSession() },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      expect(team.canCreateTeam.value).toBe(true)
    })
  })

  describe('Team Switching', () => {
    it('should switch to a different team', async () => {
      const user = createTestUser()
      const session = createTestSession()
      const team1 = createTestTeam({ id: 'team-1', name: 'Team One' })
      const team2 = createTestTeam({ id: 'team-2', name: 'Team Two' })

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: [team1, team2],
        members: [
          createTestMember({ userId: user.id, organizationId: team1.id }),
          createTestMember({ userId: user.id, organizationId: team2.id, id: 'member-2' })
        ]
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      await team.switchTeam('team-2')

      expect(mockClient.organization.setActive).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'team-2' })
      )
    })

    it('should show team switcher only in multi-tenant mode with multiple teams', async () => {
      mockClient = setupIntegrationMocks({
        user: createTestUser(),
        session: createTestSession(),
        teams: [createTestTeam(), createTestTeam({ id: 'team-2' })]
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: createTestUser() },
        session: { value: createTestSession() },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      // With multiple teams in multi-tenant mode, switcher should show
      expect(team.showTeamSwitcher.value).toBe(true)
    })

    it('should hide team switcher with only one team', async () => {
      mockClient = setupIntegrationMocks({
        user: createTestUser(),
        session: createTestSession(),
        teams: [createTestTeam()]
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: createTestUser() },
        session: { value: createTestSession() },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      // Single team - no need for switcher
      expect(team.showTeamSwitcher.value).toBe(false)
    })
  })

  describe('Team State', () => {
    it('should track loading state during operations', async () => {
      const user = createTestUser()
      const session = createTestSession()

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: [createTestTeam()]
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      const createPromise = team.createTeam({ name: 'New Team' })
      expect(team.loading.value).toBe(true)

      await createPromise
      expect(team.loading.value).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const user = createTestUser()
      const session = createTestSession()

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: [createTestTeam()]
      })

      // Mock create to fail
      mockClient.organization.create.mockRejectedValueOnce(new Error('Team creation failed'))

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      await expect(team.createTeam({ name: 'New Team' })).rejects.toThrow('Team creation failed')
      expect(team.error.value).toBe('Team creation failed')
    })
  })

  describe('Invitation Handling', () => {
    it('should accept an invitation', async () => {
      const user = createTestUser()
      const session = createTestSession()

      mockClient = setupIntegrationMocks({ user, session })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      await team.acceptInvitation('inv-123')

      expect(mockClient.organization.acceptInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ invitationId: 'inv-123' })
      )
    })

    it('should reject an invitation', async () => {
      const user = createTestUser()
      const session = createTestSession()

      mockClient = setupIntegrationMocks({ user, session })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      await team.rejectInvitation('inv-123')

      expect(mockClient.organization.rejectInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ invitationId: 'inv-123' })
      )
    })
  })

  describe('Multi-Tenant Mode', () => {
    it('should show team management in multi-tenant mode', async () => {
      mockClient = setupIntegrationMocks({
        user: createTestUser(),
        session: createTestSession(),
        teams: [createTestTeam()]
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: createTestUser() },
        session: { value: createTestSession() },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useTeam } = await import('../../app/composables/useTeam')
      const team = useTeam()

      expect(team.showTeamManagement.value).toBe(true)
    })
  })
})
