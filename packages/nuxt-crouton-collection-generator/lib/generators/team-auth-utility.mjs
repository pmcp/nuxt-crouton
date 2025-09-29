// Generator for team authentication utility
export function generateTeamAuthUtility() {
  return `import { eq, and } from 'drizzle-orm'
import * as tables from '@@/server/database/schema'

/**
 * Resolves a team by slug or ID and verifies user membership
 * @param event - The H3 event object
 * @returns Object containing the team and user
 * @throws 404 if team not found, 403 if user not authorized
 */
export async function resolveTeamAndCheckMembership(event: any) {
  const { id: teamSlugOrId } = getRouterParams(event)
  const { user } = await requireUserSession(event)

  // Try to find team by slug first (most common case)
  let team = await useDB()
    .select()
    .from(tables.teams)
    .where(eq(tables.teams.slug, teamSlugOrId))
    .get()

  // If not found by slug, try by ID (for backward compatibility)
  if (!team) {
    team = await useDB()
      .select()
      .from(tables.teams)
      .where(eq(tables.teams.id, teamSlugOrId))
      .get()
  }

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: \`Team not found: \${teamSlugOrId}\`
    })
  }

  // Check if user is a member of the team
  const membership = await useDB()
    .select()
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.teamId, team.id),
        eq(tables.teamMembers.userId, user.id)
      )
    )
    .get()

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized - You are not a member of this team'
    })
  }

  return { team, user, membership }
}

/**
 * Checks if a user is a member of a team by team ID
 * @param teamId - The team's ID (not slug)
 * @param userId - The user's ID
 * @returns Boolean indicating membership
 */
export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const membership = await useDB()
    .select()
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.teamId, teamId),
        eq(tables.teamMembers.userId, userId)
      )
    )
    .get()

  return !!membership
}`
}

// Generate file path for the utility
export function getTeamAuthUtilityPath(layer) {
  return `layers/${layer}/server/utils/team-auth.ts`
}