/**
 * Server Team Utilities
 *
 * Server-side team/organization helpers.
 * Includes mode-aware team resolution that works across all three modes.
 */
import type { H3Event } from 'h3'
import type { Team, Member, User } from '../../types'
import { useServerAuth, requireServerSession } from './useServerAuth'
import type { CroutonAuthConfig } from '../../types/config'

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
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined

  // Get authenticated session from Better Auth
  const session = await requireServerSession(event)

  let teamId: string | undefined

  switch (config?.mode) {
    case 'single-tenant':
      // Always use the default team
      teamId = config.defaultTeamId ?? 'default'
      break

    case 'personal':
      // Use user's personal team from session
      teamId = session.session.activeOrganizationId ?? undefined
      break

    case 'multi-tenant':
    default:
      // From URL param (API routes use /teams/[id]/...)
      // Fall back to session's active org
      teamId = getRouterParam(event, 'id') ?? session.session.activeOrganizationId ?? undefined
      break
  }

  if (!teamId) {
    throw createError({
      statusCode: 400,
      message: 'No team context available',
    })
  }

  // Get team from Better Auth organization API
  const team = await getTeamById(event, teamId)
  if (!team) {
    throw createError({
      statusCode: 404,
      message: 'Team not found',
    })
  }

  // Verify membership (same check for all modes)
  const membership = await getMembership(event, teamId, session.user.id)
  if (!membership) {
    throw createError({
      statusCode: 403,
      message: 'Not a team member',
    })
  }

  return {
    team,
    user: session.user as User,
    membership,
  }
}

/**
 * Get membership for a user in a team
 *
 * Uses Better Auth's organization API to check membership.
 *
 * @param event - H3 event (needed for auth instance)
 * @param teamId - Team/Organization ID
 * @param userId - User ID
 * @returns Member or null
 */
export async function getMembership(event: H3Event, teamId: string, userId: string): Promise<Member | null> {
  try {
    const auth = useServerAuth(event)

    // Use Better Auth's organization API to get member
    const response = await auth.api.listMembers({
      query: { organizationId: teamId },
      headers: event.headers,
    })

    // Find the member with matching userId
    const member = response?.members?.find((m: { userId: string }) => m.userId === userId)

    if (!member) {
      return null
    }

    // Map Better Auth member to our Member type
    return {
      id: member.id,
      organizationId: teamId,
      userId: member.userId,
      role: member.role as 'owner' | 'admin' | 'member',
      createdAt: new Date(member.createdAt),
    }
  } catch (error) {
    console.error('[crouton/auth] getMembership error:', error)
    return null
  }
}

// ============================================================================
// Team Lookup Functions
// ============================================================================

/**
 * Get team by ID
 *
 * Uses Better Auth's organization API to fetch team details.
 *
 * @param event - H3 event (needed for auth instance)
 * @param teamId - Team ID
 * @returns Team or null
 */
export async function getTeamById(event: H3Event, teamId: string): Promise<Team | null> {
  try {
    const auth = useServerAuth(event)

    // Use Better Auth's organization API to get organization
    const response = await auth.api.getFullOrganization({
      query: { organizationId: teamId },
      headers: event.headers,
    })

    if (!response) {
      return null
    }

    // Map Better Auth organization to our Team type
    return mapOrganizationToTeam(response)
  } catch (error) {
    console.error('[crouton/auth] getTeamById error:', error)
    return null
  }
}

/**
 * Get team by slug
 *
 * Uses Better Auth's organization API to fetch team by slug.
 *
 * @param event - H3 event (needed for auth instance)
 * @param slug - Team slug
 * @returns Team or null
 */
export async function getTeamBySlug(event: H3Event, slug: string): Promise<Team | null> {
  try {
    const auth = useServerAuth(event)

    // Use Better Auth's organization API to get by slug
    const response = await auth.api.getFullOrganization({
      query: { organizationSlug: slug },
      headers: event.headers,
    })

    if (!response) {
      return null
    }

    // Map Better Auth organization to our Team type
    return mapOrganizationToTeam(response)
  } catch (error) {
    console.error('[crouton/auth] getTeamBySlug error:', error)
    return null
  }
}

/**
 * Get user's teams/organizations
 *
 * @param event - H3 event (needed for auth instance)
 * @returns Array of teams the user belongs to
 */
export async function getUserTeams(event: H3Event): Promise<Team[]> {
  try {
    const auth = useServerAuth(event)

    // Use Better Auth's organization API to list user's organizations
    const response = await auth.api.listOrganizations({
      headers: event.headers,
    })

    if (!response?.length) {
      return []
    }

    // Map Better Auth organizations to our Team type
    return response.map(mapOrganizationToTeam)
  } catch (error) {
    console.error('[crouton/auth] getUserTeams error:', error)
    return []
  }
}

/**
 * Get or create default organization
 *
 * Used in single-tenant mode to ensure a default org exists.
 * This is called by the single-tenant-init plugin on startup.
 *
 * @param event - H3 event (needed for auth instance)
 * @returns The default organization
 */
export async function getOrCreateDefaultOrganization(event: H3Event): Promise<Team> {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const defaultTeamId = config?.defaultTeamId ?? 'default'
  const appName = config?.appName ?? 'Default Workspace'

  // First, try to get the existing default team
  const existingTeam = await getTeamById(event, defaultTeamId)
  if (existingTeam) {
    return existingTeam
  }

  // Team doesn't exist, need to create it
  // Note: This requires a system/admin user context
  // In production, this should be handled during initial setup
  console.log(`[crouton/auth] Default organization "${appName}" needs to be created during initial setup`)

  throw new Error(
    `[crouton/auth] Default organization not found. ` +
    `Please create an organization with ID "${defaultTeamId}" during initial admin setup.`
  )
}

/**
 * Create personal workspace for user
 *
 * Used in personal mode when user signs up.
 * Called by Better Auth's afterSignUp hook.
 *
 * @param event - H3 event (needed for auth instance)
 * @param userId - User ID
 * @param userName - User name (for workspace name)
 * @returns The created personal workspace
 */
export async function createPersonalWorkspace(event: H3Event, userId: string, userName: string): Promise<Team> {
  try {
    const auth = useServerAuth(event)

    // Create organization with personal flag
    const response = await auth.api.createOrganization({
      body: {
        name: `${userName}'s Workspace`,
        slug: userId, // Use userId as slug for personal workspaces
        metadata: JSON.stringify({
          personal: true,
          ownerId: userId,
        }),
      },
      headers: event.headers,
    })

    if (!response) {
      throw new Error('Failed to create personal workspace')
    }

    // Set as active organization for the user
    await auth.api.setActiveOrganization({
      body: { organizationId: response.id },
      headers: event.headers,
    })

    return mapOrganizationToTeam(response)
  } catch (error) {
    console.error('[crouton/auth] createPersonalWorkspace error:', error)
    throw error
  }
}

/**
 * Check if user can create more teams
 *
 * @param event - H3 event (needed for auth instance)
 * @param userId - User ID
 * @returns Whether user can create another team
 */
export async function canUserCreateTeam(event: H3Event, userId: string): Promise<boolean> {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined

  // Check mode - only multi-tenant allows team creation
  if (config?.mode !== 'multi-tenant') {
    return false
  }

  // Check if team creation is allowed
  if (config?.teams?.allowCreate === false) {
    return false
  }

  // Get user's current teams
  const teams = await getUserTeams(event)
  const limit = config?.teams?.limit ?? 5

  return teams.length < limit
}

// ============================================================================
// Role-Based Access Control
// ============================================================================

/**
 * Require user to have specific role in team
 *
 * @param event - H3 event
 * @param requiredRole - Minimum required role (owner > admin > member)
 * @returns Team context if authorized
 * @throws 403 if user doesn't have required role
 */
export async function requireTeamRole(
  event: H3Event,
  requiredRole: 'owner' | 'admin' | 'member'
): Promise<TeamContext> {
  const context = await resolveTeamAndCheckMembership(event)

  const roleHierarchy = { owner: 3, admin: 2, member: 1 }
  const userRoleLevel = roleHierarchy[context.membership.role] ?? 0
  const requiredRoleLevel = roleHierarchy[requiredRole]

  if (userRoleLevel < requiredRoleLevel) {
    throw createError({
      statusCode: 403,
      message: `Requires ${requiredRole} role or higher`,
    })
  }

  return context
}

/**
 * Require user to be team admin (admin or owner)
 */
export async function requireTeamAdmin(event: H3Event): Promise<TeamContext> {
  return requireTeamRole(event, 'admin')
}

/**
 * Require user to be team owner
 */
export async function requireTeamOwner(event: H3Event): Promise<TeamContext> {
  return requireTeamRole(event, 'owner')
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Better Auth organization response to our Team type
 */
function mapOrganizationToTeam(org: {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: string | null
  createdAt: string | Date
}): Team {
  // Parse metadata if it's a string
  let metadata: Record<string, unknown> = {}
  if (org.metadata) {
    try {
      metadata = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata
    } catch {
      metadata = {}
    }
  }

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo ?? null,
    metadata,
    personal: metadata.personal === true,
    isDefault: metadata.isDefault === true,
    createdAt: new Date(org.createdAt),
    updatedAt: new Date(org.createdAt), // Better Auth doesn't have updatedAt, use createdAt
  }
}
