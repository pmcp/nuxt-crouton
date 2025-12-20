import type { z } from 'zod'
import { defineExternalCollection } from '@friendlyinternet/nuxt-crouton/app/composables/useExternalCollection'

/**
 * SuperSaaS Connector
 *
 * Factory function for connecting SuperSaaS endpoints to Crouton collections
 * without file copying or duplicate endpoints.
 */

export interface SupersaasConnectorConfig {
  /** The SuperSaaS endpoint to proxy (e.g., 'members' for /api/teams/[id]/members) */
  sourceEndpoint: string
  /** Zod schema for validation */
  schema: z.ZodSchema
  /** Transform function to convert SuperSaaS data to Crouton format */
  transform: (item: any) => { id: string, title: string, [key: string]: any }
  /** Optional metadata */
  meta?: {
    label?: string
    description?: string
  }
}

/**
 * Connect a SuperSaaS endpoint to Crouton
 *
 * This creates a proxy configuration that lets Crouton use existing
 * SuperSaaS endpoints without copying files or creating duplicates.
 *
 * @example
 * ```typescript
 * // app.config.ts
 * import { connectSupersaas } from '@friendlyinternet/nuxt-crouton-supersaas/supersaas'
 *
 * const userSchema = z.object({
 *   id: z.string(),
 *   title: z.string(),
 *   email: z.string().optional()
 * })
 *
 * export default defineAppConfig({
 *   croutonCollections: {
 *     users: connectSupersaas({
 *       sourceEndpoint: 'members',
 *       schema: userSchema,
 *       transform: (member) => ({
 *         id: member.userId,
 *         title: member.name,
 *         email: member.email
 *       })
 *     })
 *   }
 * })
 * ```
 */
export function connectSupersaas(config: SupersaasConnectorConfig) {
  return defineExternalCollection({
    name: 'users',
    apiPath: config.sourceEndpoint,
    fetchStrategy: 'query',
    readonly: true,
    schema: config.schema,
    meta: config.meta || {
      label: 'Users',
      description: 'Team members from SuperSaaS'
    },
    // Proxy configuration
    proxy: {
      enabled: true,
      sourceEndpoint: config.sourceEndpoint,
      transform: config.transform
    }
  })
}

// Pre-configured resource exports
export { usersConfig, useUsers } from './app/composables/useUsers'
export { teamMembersConfig, useTeamMembers } from './app/composables/useTeamMembers'
