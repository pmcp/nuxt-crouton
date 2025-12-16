/**
 * useTeam Composable
 *
 * Team (organization) management composable with mode-aware behavior.
 *
 * @example
 * ```vue
 * <script setup>
 * const { currentTeam, teams, switchTeam, createTeam } = useTeam()
 * </script>
 * ```
 */
import type { Team, MemberRole, Member } from '../../types'

export interface CreateTeamData {
  name: string
  slug?: string
  logo?: string
}

export interface UpdateTeamData {
  name?: string
  slug?: string
  logo?: string
}

export interface InviteMemberData {
  email: string
  role?: MemberRole
}

export function useTeam() {
  const config = useRuntimeConfig().public.crouton?.auth

  // TODO: Phase 4 - Connect to Better Auth organization client
  // const client = useBetterAuthClient()
  // const session = useSession()

  // Reactive state (placeholders)
  const currentTeam = ref<Team | null>(null)
  const teams = ref<Team[]>([])
  const members = ref<Member[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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
    // Owner and admin can invite
    const role = currentTeam.value ? getCurrentRole() : null
    return role === 'owner' || role === 'admin'
  })

  const canManageMembers = computed(() => {
    // Only owner and admin can manage
    const role = currentTeam.value ? getCurrentRole() : null
    return role === 'owner' || role === 'admin'
  })

  const isOwner = computed(() => {
    return getCurrentRole() === 'owner'
  })

  const isAdmin = computed(() => {
    const role = getCurrentRole()
    return role === 'owner' || role === 'admin'
  })

  // Helper function
  function getCurrentRole(): MemberRole | null {
    // TODO: Phase 4 - Get from session
    return null
  }

  // Team methods (placeholders - to be implemented in Phase 4)
  async function switchTeam(_teamId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Switch team not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to switch team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function createTeam(_data: CreateTeamData): Promise<Team> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Create team not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function updateTeam(_data: UpdateTeamData): Promise<Team> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Update team not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function deleteTeam(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Delete team not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to delete team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function inviteMember(_data: InviteMemberData): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Invite member not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to invite member'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function removeMember(_userId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Remove member not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to remove member'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function updateMemberRole(_userId: string, _role: MemberRole): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Update member role not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update role'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function leaveTeam(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth
      throw new Error('@crouton/auth: Leave team not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to leave team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return {
    // State
    currentTeam: readonly(currentTeam),
    teams: readonly(teams),
    members: readonly(members),
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

    // Methods
    switchTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    inviteMember,
    removeMember,
    updateMemberRole,
    leaveTeam,
  }
}
