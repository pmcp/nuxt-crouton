import { getActiveTeamMembers } from '@@/server/database/queries/teams'
import { validateTeamOwnership } from '@@/server/utils/teamValidation.ts'

/**
 * SuperSaaS Users Connector
 *
 * A simple transform layer that converts SuperSaaS team members
 * to Crouton's expected format for CroutonReferenceSelect.
 *
 * ## Requirements
 *
 * Your SuperSaaS project must have:
 * - `getActiveTeamMembers(teamId)` in server/database/queries/teams
 * - `validateTeamOwnership(event, teamId)` in server/utils
 *
 * ## How It Works
 *
 * This connector is intentionally "dumb" - it just transforms data.
 * All routing, auth, and slug resolution is handled by SuperSaaS:
 * - Route params come from Nuxt routing (handles slug/ID automatically)
 * - Auth validation uses SuperSaaS's validateTeamOwnership
 * - No duplicate logic
 *
 * ## Customization
 *
 * Modify the transform function to add/change fields:
 * ```typescript
 * (member) => ({
 *   id: member.userId,
 *   title: `${member.name} (${member.role})`,  // Add role to display
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

    if (!teamId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Team ID is required'
      })
    }

    // Validate user has access (SuperSaaS handles auth)
    await validateTeamOwnership(event, teamId)

    // Fetch team members (SuperSaaS handles data)
    return await getActiveTeamMembers(teamId)
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
