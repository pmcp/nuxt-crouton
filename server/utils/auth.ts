/**
 * Server Auth Utilities
 *
 * Server-side authentication helpers for API routes.
 *
 * @example
 * ```typescript
 * // In an API route
 * export default defineEventHandler(async (event) => {
 *   const user = await requireAuth(event)
 *   // user is guaranteed to be authenticated
 * })
 * ```
 */
import type { H3Event } from 'h3'
import type { User, Team, Member, MemberRole } from '../../types'
import { useServerAuth, getServerSession } from './useServerAuth'

export interface AuthContext {
  user: User
}

export interface TeamContext extends AuthContext {
  team: Team
  member: Member
}

/**
 * Require authentication
 *
 * Throws 401 if user is not authenticated.
 *
 * @param event - H3 event
 * @returns Authenticated user
 * @throws 401 Unauthorized if not authenticated
 */
export async function requireAuth(event: H3Event): Promise<User> {
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Map Better Auth user to our User type
  return {
    id: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified ?? false,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    createdAt: new Date(session.user.createdAt),
    updatedAt: new Date(session.user.updatedAt),
  } as User
}

/**
 * Get authenticated user (optional)
 *
 * Returns user if authenticated, null otherwise.
 * Does not throw on missing auth.
 *
 * @param event - H3 event
 * @returns User or null
 */
export async function getAuthUser(event: H3Event): Promise<User | null> {
  try {
    return await requireAuth(event)
  }
  catch {
    return null
  }
}

/**
 * Require team membership
 *
 * Throws 401 if not authenticated, 403 if not a team member.
 *
 * @param event - H3 event
 * @returns Team context with user, team, and member info
 * @throws 401 Unauthorized if not authenticated
 * @throws 403 Forbidden if not a team member
 */
export async function requireTeamMember(event: H3Event): Promise<TeamContext> {
  const user = await requireAuth(event)
  const team = getTeamFromContext(event)

  if (!team) {
    throw createError({
      statusCode: 400,
      message: 'No team context available',
    })
  }

  // TODO: Task 2.2 - Get membership from Better Auth Organization plugin
  // This requires the organization plugin to be configured in the auth instance.
  // For now, throw a clear error about the missing implementation.
  // const auth = useServerAuth(event)
  // const member = await auth.api.organization.getMember({
  //   organizationId: team.id,
  //   userId: user.id
  // })

  throw createError({
    statusCode: 501,
    message: '@crouton/auth: Team membership requires Organization plugin (Task 2.2)',
  })
}

/**
 * Require team admin role
 *
 * Throws if not authenticated, not a member, or not admin/owner.
 *
 * @param event - H3 event
 * @returns Team context
 * @throws 401 Unauthorized if not authenticated
 * @throws 403 Forbidden if not admin or owner
 */
export async function requireTeamAdmin(event: H3Event): Promise<TeamContext> {
  const context = await requireTeamMember(event)

  const allowedRoles: MemberRole[] = ['owner', 'admin']
  if (!allowedRoles.includes(context.member.role)) {
    throw createError({
      statusCode: 403,
      message: 'Admin access required',
    })
  }

  return context
}

/**
 * Require team owner role
 *
 * Throws if not authenticated, not a member, or not owner.
 *
 * @param event - H3 event
 * @returns Team context
 * @throws 401 Unauthorized if not authenticated
 * @throws 403 Forbidden if not owner
 */
export async function requireTeamOwner(event: H3Event): Promise<TeamContext> {
  const context = await requireTeamMember(event)

  if (context.member.role !== 'owner') {
    throw createError({
      statusCode: 403,
      message: 'Owner access required',
    })
  }

  return context
}

/**
 * Get team from request context
 *
 * Resolves team from URL params, headers, or session.
 *
 * @param event - H3 event
 * @returns Team or null
 */
export function getTeamFromContext(event: H3Event): Team | null {
  // Check event context (set by middleware)
  const team = event.context.team as Team | undefined
  if (team) return team

  // Check URL params (multi-tenant mode)
  const teamSlug = getRouterParam(event, 'team')
  if (teamSlug) {
    // TODO: Phase 4 - Look up team by slug
    // return await getTeamBySlug(teamSlug)
  }

  // Check header (API clients)
  const teamId = getHeader(event, 'x-team-id')
  if (teamId) {
    // TODO: Phase 4 - Look up team by ID
    // return await getTeamById(teamId)
  }

  return null
}

/**
 * Set team in request context
 *
 * Used by middleware to inject team context.
 *
 * @param event - H3 event
 * @param team - Team to set
 */
export function setTeamContext(event: H3Event, team: Team): void {
  event.context.team = team
}
