import { deleteTeamMember } from '@@/server/database/queries/teams'
import { validateTeamOwnership } from '@@/server/utils/teamValidation.ts'

/**
 * SuperSaaS Delete Member Endpoint
 *
 * RESTful endpoint for deleting (or soft-deleting) a team member.
 * Used by Crouton's delete flows.
 *
 * ## Requirements
 *
 * Your SuperSaaS project must have:
 * - `deleteTeamMember(teamId, memberId)` in server/database/queries/teams
 * - `validateTeamOwnership(event, teamId)` in server/utils
 *
 * ## How It Works
 *
 * 1. Validates team access via SuperSaaS's validateTeamOwnership
 * 2. Deletes member via SuperSaaS's deleteTeamMember
 * 3. Returns success response
 *
 * ## Example Implementation
 *
 * If you don't have `deleteTeamMember` yet, create it:
 * ```typescript
 * // server/database/queries/teams.ts
 * export async function deleteTeamMember(teamId: string, memberId: string) {
 *   const db = useDB()
 *
 *   // Option 1: Hard delete
 *   return await db
 *     .delete(teamMembers)
 *     .where(
 *       and(
 *         eq(teamMembers.teamId, teamId),
 *         eq(teamMembers.userId, memberId)
 *       )
 *     )
 *     .returning()
 *     .get()
 *
 *   // Option 2: Soft delete (recommended)
 *   return await db
 *     .update(teamMembers)
 *     .set({
 *       deletedAt: new Date(),
 *       status: 'deleted'
 *     })
 *     .where(
 *       and(
 *         eq(teamMembers.teamId, teamId),
 *         eq(teamMembers.userId, memberId)
 *       )
 *     )
 *     .returning()
 *     .get()
 * }
 * ```
 */

export default defineEventHandler(async (event) => {
  const teamId = getRouterParam(event, 'id')
  const memberId = getRouterParam(event, 'memberId')

  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team ID is required'
    })
  }

  if (!memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Member ID is required'
    })
  }

  // Validate user has access (SuperSaaS handles auth)
  await validateTeamOwnership(event, teamId)

  try {
    // Delete member (SuperSaaS handles data)
    const deletedMember = await deleteTeamMember(teamId, memberId)

    if (!deletedMember) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Member not found'
      })
    }

    return {
      success: true,
      message: 'Member deleted successfully',
      id: memberId
    }
  } catch (error) {
    console.error('[SuperSaaS Connector] Delete member failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to delete member'
    })
  }
})
