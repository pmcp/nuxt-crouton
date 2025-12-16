/**
 * Server Auth Utilities
 *
 * Server-side authentication helpers for API routes.
 * These are the main exports for @crouton/auth server utilities.
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
import type { User, Team, Member } from '../../types'
import { getServerSession } from './useServerAuth'
import {
  resolveTeamAndCheckMembership,
  requireTeamAdmin as _requireTeamAdmin,
  requireTeamOwner as _requireTeamOwner,
} from './team'

// Re-export team utilities for convenience
export {
  resolveTeamAndCheckMembership,
  getTeamById,
  getTeamBySlug,
  getUserTeams,
  getMembership,
  canUserCreateTeam,
  createPersonalWorkspace,
  getOrCreateDefaultOrganization,
} from './team'

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
 * Uses mode-aware team resolution:
 * - Multi-tenant: Resolves from URL param or session
 * - Single-tenant: Always uses default team
 * - Personal: Uses user's personal team from session
 *
 * @param event - H3 event
 * @returns Team context with user, team, and member info
 * @throws 401 Unauthorized if not authenticated
 * @throws 403 Forbidden if not a team member
 */
export async function requireTeamMember(event: H3Event): Promise<TeamContext> {
  const context = await resolveTeamAndCheckMembership(event)

  return {
    user: context.user,
    team: context.team,
    member: context.membership,
  }
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
  const context = await _requireTeamAdmin(event)

  return {
    user: context.user,
    team: context.team,
    member: context.membership,
  }
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
  const context = await _requireTeamOwner(event)

  return {
    user: context.user,
    team: context.team,
    member: context.membership,
  }
}

/**
 * Get team from request context
 *
 * Resolves team from URL params, headers, or session.
 * This is a sync function for checking context - use getTeamById/getTeamBySlug
 * for async lookups.
 *
 * @param event - H3 event
 * @returns Team or null
 */
export function getTeamFromContext(event: H3Event): Team | null {
  // Check event context (set by middleware)
  const team = event.context.team as Team | undefined
  if (team) return team

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
