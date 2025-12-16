/**
 * Server Team Utilities
 *
 * Server-side team/organization helpers.
 */
import type { Team } from '../../types'

/**
 * Get team by ID
 *
 * @param teamId - Team ID
 * @returns Team or null
 */
export async function getTeamById(_teamId: string): Promise<Team | null> {
  // TODO: Phase 4 - Implement with Better Auth
  // const auth = useServerAuth()
  // return auth.api.organization.get({ organizationId: teamId })

  return null
}

/**
 * Get team by slug
 *
 * @param slug - Team slug
 * @returns Team or null
 */
export async function getTeamBySlug(_slug: string): Promise<Team | null> {
  // TODO: Phase 4 - Implement with Better Auth
  // const auth = useServerAuth()
  // return auth.api.organization.getBySlug({ slug })

  return null
}

/**
 * Get or create default organization
 *
 * Used in single-tenant mode to ensure a default org exists.
 *
 * @returns The default organization
 */
export async function getOrCreateDefaultOrganization(): Promise<Team> {
  // TODO: Phase 3 - Implement for single-tenant mode
  // Check if default org exists
  // If not, create it with isDefault: true

  throw new Error('@crouton/auth: getOrCreateDefaultOrganization not yet implemented. Complete Phase 3.')
}

/**
 * Create personal workspace for user
 *
 * Used in personal mode when user signs up.
 *
 * @param userId - User ID
 * @param userName - User name (for workspace name)
 * @returns The created personal workspace
 */
export async function createPersonalWorkspace(_userId: string, _userName: string): Promise<Team> {
  // TODO: Phase 3 - Implement for personal mode
  // Create organization with:
  // - name: `${userName}'s Workspace`
  // - personal: true
  // - Add user as owner

  throw new Error('@crouton/auth: createPersonalWorkspace not yet implemented. Complete Phase 3.')
}

/**
 * Check if user can create more teams
 *
 * @param userId - User ID
 * @returns Whether user can create another team
 */
export async function canUserCreateTeam(_userId: string): Promise<boolean> {
  const config = useRuntimeConfig().public.crouton?.auth

  // Check mode
  if (config?.mode !== 'multi-tenant') {
    return false
  }

  // Check if team creation is allowed
  if (config?.teams?.allowCreate === false) {
    return false
  }

  // TODO: Phase 4 - Check current team count against limit
  // const teams = await getUserTeams(userId)
  // const limit = config?.teams?.limit ?? 5
  // return teams.length < limit

  return true
}
