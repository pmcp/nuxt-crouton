/**
 * useTeam Composable
 *
 * Team (organization) management composable with mode-aware behavior.
 * Uses Better Auth's organization client for all operations.
 *
 * @example
 * ```vue
 * <script setup>
 * const { currentTeam, teams, switchTeam, createTeam, canCreateTeam } = useTeam()
 *
 * // Create a new team (multi-tenant mode)
 * if (canCreateTeam.value) {
 *   await createTeam({ name: 'New Team', slug: 'new-team' })
 * }
 *
 * // Switch active team
 * await switchTeam(teamId)
 * </script>
 * ```
 */
import type { Team, MemberRole, Member } from '../../types'
import type { CroutonAuthConfig } from '../../types/config'

export interface CreateTeamData {
  name: string
  slug?: string
  logo?: string
  metadata?: Record<string, unknown>
}

export interface UpdateTeamData {
  name?: string
  slug?: string
  logo?: string
  metadata?: Record<string, unknown>
}

export interface InviteMemberData {
  email: string
  role?: MemberRole
}

/**
 * Get the Better Auth client from the plugin
 */
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}

/**
 * Map Better Auth organization to our Team type
 *
 * Supports both new columns (Task 6.2) and legacy metadata for backward compatibility.
 */
function mapOrganizationToTeam(org: {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: string | Record<string, unknown> | null
  // New columns from Task 6.2
  personal?: boolean | number | null
  isDefault?: boolean | number | null
  ownerId?: string | null
  createdAt: string | Date
}): Team {
  // Parse metadata if it's a string (for legacy data)
  let metadata: Record<string, unknown> = {}
  if (org.metadata) {
    try {
      metadata = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata
    }
    catch {
      metadata = {}
    }
  }

  // Prefer new columns (Task 6.2), fall back to metadata for backward compatibility
  // SQLite returns 0/1 for booleans, so check for truthy value
  const isPersonal = org.personal === true || org.personal === 1 || metadata.personal === true
  const isDefaultOrg = org.isDefault === true || org.isDefault === 1 || metadata.isDefault === true

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo ?? null,
    metadata,
    personal: isPersonal,
    isDefault: isDefaultOrg,
    ownerId: org.ownerId ?? (metadata.ownerId as string | undefined),
    createdAt: new Date(org.createdAt),
    updatedAt: new Date(org.createdAt),
  }
}

/**
 * Map Better Auth member to our Member type
 */
function mapMember(m: {
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: string | Date
  user?: {
    id: string
    name?: string | null
    email: string
    image?: string | null
  }
}): Member {
  return {
    id: m.id,
    organizationId: m.organizationId,
    userId: m.userId,
    role: m.role as MemberRole,
    createdAt: new Date(m.createdAt),
  }
}

export function useTeam() {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const authClient = useAuthClient()

  // Use Better Auth's reactive hooks
  const { data: organizationsData } = authClient.useListOrganizations()
  const { data: activeOrgData } = authClient.useActiveOrganization()

  // Local state
  const loading = ref(false)
  const error = ref<string | null>(null)
  const membersData = ref<Member[]>([])

  // Computed: current team (active organization)
  const currentTeam = computed<Team | null>(() => {
    if (!activeOrgData.value) return null
    return mapOrganizationToTeam(activeOrgData.value)
  })

  // Computed: all user's teams
  const teams = computed<Team[]>(() => {
    if (!organizationsData.value) return []
    return organizationsData.value.map(mapOrganizationToTeam)
  })

  // Computed: team members (loaded separately)
  const members = computed(() => membersData.value)

  // Get current user's role in active team
  const currentRole = computed<MemberRole | null>(() => {
    // Check if we have active org data with members
    const activeOrg = activeOrgData.value as { members?: Array<{ userId: string, role: string }> } | null
    if (!activeOrg?.members) return null

    // Get current user from session
    const { user } = useSession()
    if (!user.value) return null

    // Find member entry
    const member = activeOrg.members.find(m => m.userId === user.value?.id)
    return member?.role as MemberRole ?? null
  })

  // Mode-aware computed properties
  const showTeamSwitcher = computed(() => {
    return config?.mode === 'multi-tenant' && teams.value.length > 1
  })

  const showTeamManagement = computed(() => {
    return config?.mode === 'multi-tenant'
  })

  const canCreateTeam = computed(() => {
    if (config?.mode !== 'multi-tenant') return false
    if (config?.teams?.allowCreate === false) return false
    const limit = config?.teams?.limit ?? 5
    return teams.value.length < limit
  })

  const canInviteMembers = computed(() => {
    const role = currentRole.value
    return role === 'owner' || role === 'admin'
  })

  const canManageMembers = computed(() => {
    const role = currentRole.value
    return role === 'owner' || role === 'admin'
  })

  const isOwner = computed(() => currentRole.value === 'owner')
  const isAdmin = computed(() => {
    const role = currentRole.value
    return role === 'owner' || role === 'admin'
  })

  // ============================================================================
  // Team Methods
  // ============================================================================

  /**
   * Switch to a different team (set as active organization)
   */
  async function switchTeam(teamId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.organization.setActive({
        organizationId: teamId,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to switch team')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to switch team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Switch to team by slug
   */
  async function switchTeamBySlug(slug: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.organization.setActive({
        organizationSlug: slug,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to switch team')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to switch team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Create a new team (multi-tenant mode only)
   */
  async function createTeam(data: CreateTeamData): Promise<Team> {
    loading.value = true
    error.value = null
    try {
      if (!canCreateTeam.value) {
        throw new Error('Cannot create more teams. Limit reached or not in multi-tenant mode.')
      }

      const result = await authClient.organization.create({
        name: data.name,
        slug: data.slug,
        logo: data.logo,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to create team')
      }

      if (!result.data) {
        throw new Error('No data returned from create team')
      }

      return mapOrganizationToTeam(result.data)
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Update the current team
   */
  async function updateTeam(data: UpdateTeamData): Promise<Team> {
    loading.value = true
    error.value = null
    try {
      if (!currentTeam.value) {
        throw new Error('No active team to update')
      }

      const result = await authClient.organization.update({
        organizationId: currentTeam.value.id,
        data: {
          name: data.name,
          slug: data.slug,
          logo: data.logo,
          metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        },
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to update team')
      }

      if (!result.data) {
        throw new Error('No data returned from update team')
      }

      return mapOrganizationToTeam(result.data)
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Delete the current team (owner only)
   */
  async function deleteTeam(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!currentTeam.value) {
        throw new Error('No active team to delete')
      }

      if (!isOwner.value) {
        throw new Error('Only the team owner can delete the team')
      }

      const result = await authClient.organization.delete({
        organizationId: currentTeam.value.id,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to delete team')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to delete team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  // ============================================================================
  // Member Methods
  // ============================================================================

  /**
   * Load members for the current team
   */
  async function loadMembers(): Promise<void> {
    if (!currentTeam.value) {
      membersData.value = []
      return
    }

    try {
      const result = await authClient.organization.listMembers({
        organizationId: currentTeam.value.id,
      })

      if (result.error) {
        console.error('Failed to load members:', result.error)
        membersData.value = []
        return
      }

      membersData.value = (result.data?.members ?? []).map(mapMember)
    }
    catch (e) {
      console.error('Failed to load members:', e)
      membersData.value = []
    }
  }

  /**
   * Invite a new member to the current team
   */
  async function inviteMember(data: InviteMemberData): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!currentTeam.value) {
        throw new Error('No active team')
      }

      if (!canInviteMembers.value) {
        throw new Error('You do not have permission to invite members')
      }

      const result = await authClient.organization.inviteMember({
        organizationId: currentTeam.value.id,
        email: data.email,
        role: data.role ?? 'member',
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to invite member')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to invite member'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Remove a member from the current team
   */
  async function removeMember(userId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!currentTeam.value) {
        throw new Error('No active team')
      }

      if (!canManageMembers.value) {
        throw new Error('You do not have permission to remove members')
      }

      const result = await authClient.organization.removeMember({
        organizationId: currentTeam.value.id,
        memberIdOrEmail: userId,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to remove member')
      }

      // Refresh members list
      await loadMembers()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to remove member'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Update a member's role
   */
  async function updateMemberRole(userId: string, role: MemberRole): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!currentTeam.value) {
        throw new Error('No active team')
      }

      if (!canManageMembers.value) {
        throw new Error('You do not have permission to manage members')
      }

      const result = await authClient.organization.updateMemberRole({
        organizationId: currentTeam.value.id,
        memberId: userId,
        role,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to update role')
      }

      // Refresh members list
      await loadMembers()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update role'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Leave the current team
   */
  async function leaveTeam(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!currentTeam.value) {
        throw new Error('No active team')
      }

      if (isOwner.value) {
        throw new Error('Team owner cannot leave. Transfer ownership or delete the team.')
      }

      // Get current user
      const { user } = useSession()
      if (!user.value) {
        throw new Error('Not authenticated')
      }

      const result = await authClient.organization.removeMember({
        organizationId: currentTeam.value.id,
        memberIdOrEmail: user.value.id,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to leave team')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to leave team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  // ============================================================================
  // Invitation Methods
  // ============================================================================

  /**
   * Get pending invitations for the current team
   */
  async function getPendingInvitations() {
    if (!currentTeam.value) return []

    try {
      const result = await authClient.organization.listInvitations({
        organizationId: currentTeam.value.id,
      })

      if (result.error) {
        console.error('Failed to get invitations:', result.error)
        return []
      }

      return result.data?.invitations ?? []
    }
    catch (e) {
      console.error('Failed to get invitations:', e)
      return []
    }
  }

  /**
   * Cancel a pending invitation
   */
  async function cancelInvitation(invitationId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.organization.cancelInvitation({
        invitationId,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to cancel invitation')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to cancel invitation'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Accept an invitation (for the current user)
   */
  async function acceptInvitation(invitationId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to accept invitation')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to accept invitation'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Reject an invitation (for the current user)
   */
  async function rejectInvitation(invitationId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await authClient.organization.rejectInvitation({
        invitationId,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to reject invitation')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to reject invitation'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return {
    // State
    currentTeam,
    teams,
    members,
    currentRole,
    loading: readonly(loading),
    error: readonly(error),

    // Mode-aware flags
    showTeamSwitcher,
    showTeamManagement,
    canCreateTeam,
    canInviteMembers,
    canManageMembers,
    isOwner,
    isAdmin,

    // Team methods
    switchTeam,
    switchTeamBySlug,
    createTeam,
    updateTeam,
    deleteTeam,

    // Member methods
    loadMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
    leaveTeam,

    // Invitation methods
    getPendingInvitations,
    cancelInvitation,
    acceptInvitation,
    rejectInvitation,
  }
}
