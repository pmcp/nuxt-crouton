/**
 * Type declarations for #crouton/team-auth Nitro alias
 * This module provides team-based authentication utilities for server-side code
 */
declare module '#crouton/team-auth' {
  import type { H3Event } from 'h3'

  interface Team {
    id: string
    slug: string
    name: string
    [key: string]: any
  }

  interface User {
    id: string
    email: string
    [key: string]: any
  }

  interface TeamMembership {
    teamId: string
    userId: string
    role?: string
    [key: string]: any
  }

  interface TeamAuthResult {
    team: Team
    user: User
    membership: TeamMembership
  }

  /**
   * Resolves a team by slug or ID and verifies user membership
   * @param event - The H3 event object
   * @returns Object containing the team, user, and membership
   * @throws 404 if team not found, 403 if user not authorized
   */
  export function resolveTeamAndCheckMembership(event: H3Event): Promise<TeamAuthResult>

  /**
   * Checks if a user is a member of a team by team ID
   * @param teamId - The team's ID (not slug)
   * @param userId - The user's ID
   * @returns Boolean indicating membership
   */
  export function isTeamMember(teamId: string, userId: string): Promise<boolean>
}
