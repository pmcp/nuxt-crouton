/**
 * Server Team Utilities
 *
 * Server-side team/organization helpers.
 * Includes mode-aware team resolution that works across all three modes.
 */
import type { H3Event } from 'h3'
import type { Team, Member, User } from '../../types'

// ============================================================================
// Core Team Resolution (Mode-Aware)
// ============================================================================

export interface TeamContext {
  team: Team
  user: User
  membership: Member
}

/**
 * Resolve team and check membership (mode-aware)
 *
 * This is the MAIN function for API routes to get team context.
 * It handles all three modes automatically:
 *
 * - Multi-tenant: Resolves from URL param or session
 * - Single-tenant: Always uses the default team
 * - Personal: Uses user's personal team from session
 *
 * @param event - H3 event
 * @returns Team context with team, user, and membership
 * @throws 401 if not authenticated
 * @throws 403 if not a team member
 * @throws 404 if team not found
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const { team, user, membership } = await resolveTeamAndCheckMembership(event)
 *   // team is guaranteed to be valid
 *   // user is authenticated
 *   // membership is verified
 * })
 * ```
 */
export async function resolveTeamAndCheckMembership(event: H3Event): Promise<TeamContext> {
  const config = useRuntimeConfig().public.crouton?.auth

  // TODO: Phase 2 - Get session from Better Auth
  // const session = await requireSession(event)
  // For now, throw not implemented
  const session = null as unknown as { user: User; activeOrganizationId?: string }

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  let teamId: string | undefined

  switch (config?.mode) {
    case 'single-tenant':
      // Always use the default team
      teamId = (config as { defaultTeamId?: string }).defaultTeamId ?? 'default'
      break

    case 'personal':
      // Use user's personal team from session
      teamId = session.activeOrganizationId
      break

    case 'multi-tenant':
    default:
      // From URL param (API routes use /teams/[id]/...)
      // Fall back to session's active org
      teamId = getRouterParam(event, 'id') ?? session.activeOrganizationId
      break
  }

  if (!teamId) {
    throw createError({
      statusCode: 400,
      message: 'No team context available',
    })
  }

  // Get team
  const team = await getTeamById(teamId)
  if (!team) {
    throw createError({
      statusCode: 404,
      message: 'Team not found',
    })
  }

  // Verify membership (same check for all modes)
  const membership = await getMembership(teamId, session.user.id)
  if (!membership) {
    throw createError({
      statusCode: 403,
      message: 'Not a team member',
    })
  }

  return {
    team,
    user: session.user,
    membership,
  }
}

/**
 * Get membership for a user in a team
 *
 * @param teamId - Team/Organization ID
 * @param userId - User ID
 * @returns Member or null
 */
export async function getMembership(_teamId: string, _userId: string): Promise<Member | null> {
  // TODO: Phase 2 - Implement with Better Auth
  // const auth = useServerAuth()
  // return auth.api.organization.getMember({
  //   organizationId: teamId,
  //   userId: userId
  // })

  return null
}

// ============================================================================
// Team Lookup Functions
// ============================================================================

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
