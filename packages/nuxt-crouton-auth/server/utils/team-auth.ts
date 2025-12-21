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
