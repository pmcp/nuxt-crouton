import { z } from 'zod'
import { defineExternalCollection } from './useExternalCollection'

/**
 * EXAMPLE: Users collection connector
 *
 * This is a reference implementation showing how to connect an external
 * user management system to Crouton's reference system.
 *
 * Copy this pattern for your own project and customize as needed.
 *
 * ## Setup Instructions
 *
 * ### 1. Copy this file to your project
 * ```
 * /app/composables/useUsers.ts
 * ```
 *
 * ### 2. Create the API endpoint
 * ```typescript
 * // server/api/teams/[id]/users/index.get.ts
 * import { getActiveTeamMembers } from '~/server/database/queries/teams'
 * import { validateTeamOwnership } from '~/server/utils/teamValidation'
 *
 * // createExternalCollectionHandler is auto-imported from nuxt-crouton
 * export default createExternalCollectionHandler(
 *   async (event) => {
 *     const teamId = getRouterParam(event, 'id')
 *     await validateTeamOwnership(event, teamId!)
 *     return await getActiveTeamMembers(teamId!)
 *   },
 *   (member) => ({
 *     id: member.userId,
 *     title: member.name,
 *     email: member.email,
 *     avatarUrl: member.avatarUrl,
 *     role: member.role
 *   })
 * )
 * ```
 *
 * ### 3. Register in app.config.ts
 * ```typescript
 * import { usersConfig } from './composables/useUsers'
 *
 * export default defineAppConfig({
 *   croutonCollections: {
 *     users: usersConfig,
 *     // ... other collections
 *   }
 * })
 * ```
 *
 * ### 4. Use `:users` prefix in schemas
 * ```json
 * {
 *   "updatedBy": {
 *     "type": "string",
 *     "refTarget": ":users",
 *     "meta": { "label": "Updated By" }
 *   }
 * }
 * ```
 *
 * ### 5. (Optional) Auto-populate server-side
 * ```typescript
 * // In your PATCH/POST handlers
 * export default defineEventHandler(async (event) => {
 *   const session = await getUserSession(event)
 *   const body = await readBody(event)
 *
 *   // Auto-populate updatedBy with current user
 *   body.updatedBy = session.user.id
 *
 *   // ... save logic
 * })
 * ```
 */

// Schema matching CroutonReferenceSelect requirements
const userSchema = z.object({
  id: z.string(),
  title: z.string(), // Required: Used for display in dropdowns
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.string().optional()
})

export const usersConfig = defineExternalCollection({
  name: 'users',
  schema: userSchema,
  meta: {
    label: 'Users',
    description: 'External user collection from auth system'
  }
})

export const useUsers = () => usersConfig
