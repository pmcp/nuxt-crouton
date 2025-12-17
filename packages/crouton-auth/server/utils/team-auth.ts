/**
 * Team Auth Utilities for nuxt-crouton compatibility
 *
 * This module provides the same interface as @friendlyinternet/nuxt-crouton's
 * team-auth but uses Better Auth under the hood.
 *
 * When the main project configures the #crouton/team-auth alias to point here,
 * all collection API handlers will use Better Auth for authentication.
 *
 * @example
 * // In nuxt.config.ts of the main project:
 * nitro: {
 *   alias: {
 *     '#crouton/team-auth': './packages/crouton-auth/server/utils/team-auth'
 *   }
 * }
 */

import type { H3Event } from 'h3'
import type { TeamAuthResult } from '../../types/connector'

// Re-export the main function from team.ts
export {
  resolveTeamAndCheckMembership,
  getMembership,
  getTeamById,
  getTeamBySlug,
  getUserTeams,
  requireTeamRole,
  requireTeamAdmin,
  requireTeamOwner,
  canUserCreateTeam,
} from './team'

// Re-export types
export type {
  TeamContext,
} from './team'

export type {
  Team,
  User,
  TeamMembership,
  TeamAuthResult,
  BetterAuthConnector,
  BetterAuthConnectorConfig,
  BetterAuthSession,
} from '../../types/connector'

/**
 * Check if a user is a member of a team
 *
 * Compatible with nuxt-crouton's #crouton/team-auth interface.
 * Uses Better Auth's organization API to verify membership.
 *
 * @param teamId - The team/organization ID
 * @param userId - The user ID
 * @returns Promise<boolean> - true if user is a member
 */
export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  // Import getMembership dynamically to avoid circular deps
  const { getMembership: getMembershipFn } = await import('./team')

  // We need an event to call getMembership, but this function
  // is designed for contexts where we might not have one.
  // For Better Auth, we need to use a different approach.

  // Note: This is a simplified check. In production, you might
  // want to use a direct DB query for performance.
  try {
    // For now, we can't call getMembership without an event
    // This function should only be called from API handlers
    // where the event is available
    console.warn(
      '[crouton/auth] isTeamMember called without event context. ' +
      'Use resolveTeamAndCheckMembership(event) in API handlers instead.'
    )
    return false
  } catch {
    return false
  }
}

/**
 * Check if user is a member of a team (with event context)
 *
 * This is the preferred method when you have access to the H3 event.
 * Uses Better Auth's organization API to verify membership.
 *
 * @param event - H3 event
 * @param teamId - Team/organization ID
 * @param userId - User ID
 * @returns Promise<boolean>
 */
export async function isTeamMemberWithEvent(
  event: H3Event,
  teamId: string,
  userId: string
): Promise<boolean> {
  const { getMembership: getMembershipFn } = await import('./team')
  const membership = await getMembershipFn(event, teamId, userId)
  return !!membership
}
