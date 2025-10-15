import { z } from 'zod'
import { defineExternalCollection } from '@friendlyinternet/nuxt-crouton/app/composables/useExternalCollection'

/**
 * SuperSaaS Team Members Adapter
 *
 * Connects SuperSaaS team member management to Crouton's reference system.
 * Proxies to existing /api/teams/[id]/members endpoint.
 *
 * ## Requirements
 *
 * Your SuperSaaS project must have:
 * - getActiveTeamMembers(teamId) function in server/database/queries/teams
 * - /api/teams/[id]/members endpoint
 *
 * ## Usage
 *
 * ```typescript
 * // app.config.ts
 * import { teamMembersConfig } from '@friendlyinternet/nuxt-crouton-connector/supersaas'
 *
 * export default defineAppConfig({
 *   croutonCollections: {
 *     teamMembers: teamMembersConfig
 *   }
 * })
 * ```
 */

const teamMemberSchema = z.object({
  id: z.string(),
  title: z.string(), // Required: Used for display in dropdowns
  userId: z.string(),
  teamId: z.string(),
  role: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().optional()
})

export const teamMembersConfig = defineExternalCollection({
  name: 'teamMembers',
  schema: teamMemberSchema,
  readonly: true, // Team members are managed by SuperSaaS, not editable through Crouton
  meta: {
    label: 'Team Members',
    description: 'Members of the current team'
  },
  proxy: {
    enabled: true,
    sourceEndpoint: 'members', // Proxies to /api/teams/[id]/members
    transform: (member) => ({
      id: member.id,
      title: member.name || member.email || member.userId, // Add title from existing data
      userId: member.userId,
      teamId: member.teamId,
      role: member.role,
      email: member.email,
      name: member.name,
      avatarUrl: member.avatarUrl
    })
  }
})

export const useTeamMembers = () => teamMembersConfig
