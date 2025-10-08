import { getActiveTeamMembers } from '@@/server/database/queries/teams'
import { validateTeamOwnership } from '@@/server/utils/teamValidation.ts'

/**
 * SuperSaaS Single Member Endpoint
 *
 * RESTful endpoint for fetching a single team member by ID.
 * Used by Crouton's useCollectionItem when fetchStrategy is 'restful'.
 *
 * ## Requirements
 *
 * Your SuperSaaS project must have:
 * - `getActiveTeamMembers(teamId)` in server/database/queries/teams
 * - `validateTeamOwnership(event, teamId)` in server/utils
 *
 * ## How It Works
 *
 * 1. Validates team access via SuperSaaS's validateTeamOwnership
 * 2. Fetches all team members
 * 3. Filters to the requested member ID
 * 4. Transforms to Crouton format
 *
 * ## Customization
 *
 * Modify the transform function to add/change fields:
 * ```typescript
 * (member) => ({
 *   id: member.userId,
 *   title: `${member.name} (${member.role})`,
 *   email: member.email,
 *   avatarUrl: member.avatarUrl,
 *   role: member.role,
 *   department: member.department  // Add custom fields
 * })
 * ```
 */

export default createExternalCollectionHandler(
  async (event) => {
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

    // Fetch team members (SuperSaaS handles data)
    const members = await getActiveTeamMembers(teamId)

    // Filter to requested member
    const member = members.find(m => m.userId === memberId)

    if (!member) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Member not found'
      })
    }

    return [member] // Return as array for transformer compatibility
  },

  // Transform: SuperSaaS format → Crouton format
  (member) => ({
    id: member.userId,
    title: member.name,        // Required for CroutonReferenceSelect
    email: member.email,
    avatarUrl: member.avatarUrl,
    role: member.role
  })
)
