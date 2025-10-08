import { updateTeamMember } from '@@/server/database/queries/teams'
import { validateTeamOwnership } from '@@/server/utils/teamValidation.ts'

/**
 * SuperSaaS Update Member Endpoint
 *
 * RESTful endpoint for updating a team member.
 * Used by Crouton's update/edit flows.
 *
 * ## Requirements
 *
 * Your SuperSaaS project must have:
 * - `updateTeamMember(teamId, memberId, data)` in server/database/queries/teams
 * - `validateTeamOwnership(event, teamId)` in server/utils
 *
 * ## How It Works
 *
 * 1. Validates team access via SuperSaaS's validateTeamOwnership
 * 2. Reads update data from request body
 * 3. Updates member via SuperSaaS's updateTeamMember
 * 4. Returns updated member
 *
 * ## Example Implementation
 *
 * If you don't have `updateTeamMember` yet, create it:
 * ```typescript
 * // server/database/queries/teams.ts
 * export async function updateTeamMember(teamId: string, memberId: string, data: Partial<Member>) {
 *   const db = useDB()
 *   return await db
 *     .update(teamMembers)
 *     .set({
 *       ...data,
 *       updatedAt: new Date()
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

  // Read update data
  const body = await readBody(event)

  try {
    // Update member (SuperSaaS handles data)
    const updatedMember = await updateTeamMember(teamId, memberId, body)

    if (!updatedMember) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Member not found'
      })
    }

    // Transform to Crouton format
    return {
      id: updatedMember.userId,
      title: updatedMember.name,
      email: updatedMember.email,
      avatarUrl: updatedMember.avatarUrl,
      role: updatedMember.role
    }
  } catch (error) {
    console.error('[SuperSaaS Connector] Update member failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to update member'
    })
  }
})
