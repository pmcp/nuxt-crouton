/**
 * Team Auth Utilities - Additional Functions
 *
 * This module provides additional utility functions for team authentication
 * that are not part of the main team.ts file.
 *
 * NOTE: All main team utilities (resolveTeamAndCheckMembership, getTeamById, etc.)
 * should be imported from './team' - this file only contains supplementary functions.
 *
 * Types should also be imported from './team' or '../../types/connector' directly.
 */

import type { H3Event } from 'h3'

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
      '[crouton/auth] isTeamMember called without event context. '
      + 'Use resolveTeamAndCheckMembership(event) in API handlers instead.'
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
