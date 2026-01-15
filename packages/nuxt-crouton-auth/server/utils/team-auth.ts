/**
 * Team Auth Utilities - Entry Point
 *
 * This module is the entry point for team authentication utilities.
 * It re-exports all functions from team.ts and provides additional helpers.
 *
 * Usage:
 *   import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
 *
 * Types should be imported from '../../types/connector' directly.
 */

// Re-export all main team utilities
export * from './team'

import type { H3Event } from 'h3'

/**
 * Check if user is a member of a team (with event context)
 *
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
