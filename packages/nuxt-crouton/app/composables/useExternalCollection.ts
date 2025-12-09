/**
 * Create a minimal collection config for external resources
 *
 * Use this when you want Crouton's CroutonReferenceSelect to work with
 * collections managed outside of Crouton (e.g., users from your auth system).
 *
 * @example
 * ```typescript
 * import { defineExternalCollection } from '@friendlyinternet/nuxt-crouton'
 * import { z } from 'zod'
 *
 * const userSchema = z.object({
 *   id: z.string(),
 *   title: z.string(), // Required for CroutonReferenceSelect display
 *   email: z.string().optional(),
 *   avatarUrl: z.string().optional()
 * })
 *
 * export const usersConfig = defineExternalCollection({
 *   name: 'users',
 *   schema: userSchema
 * })
 *
 * // Then register in app.config.ts:
 * export default defineAppConfig({
 *   croutonCollections: {
 *     users: usersConfig,
 *     // ... other collections
 *   }
 * })
 * ```
 *
 * @param config - External collection configuration
 * @param config.name - Collection name (must match app.config.ts key)
 * @param config.schema - Zod schema for validation and types
 * @param config.apiPath - API path (defaults to collection name)
 * @param config.fetchStrategy - Fetch strategy: 'query' uses ?ids=, 'restful' uses /{id} (defaults to 'query')
 * @param config.readonly - Read-only collection - hides edit/delete buttons in CardMini (defaults to true)
 * @param config.meta - Optional metadata for display (label, description)
 * @param config.proxy - Proxy configuration for connecting to existing endpoints
 * @returns Collection config compatible with Crouton registry
 */
export function defineExternalCollection(config: {
  name: string
  schema: any
  apiPath?: string
  fetchStrategy?: 'query' | 'restful'
  readonly?: boolean
  meta?: {
    label?: string
    description?: string
  }
  proxy?: {
    enabled: boolean
    sourceEndpoint: string
    transform: (item: any) => { id: string, title: string, [key: string]: any }
  }
}) {
  return {
    name: config.name,
    layer: 'external',
    apiPath: config.apiPath || config.name,
    fetchStrategy: config.fetchStrategy || 'query',
    readonly: config.readonly !== false,
    componentName: null,
    schema: config.schema,
    defaultValues: {},
    columns: [],
    meta: config.meta || {},
    proxy: config.proxy
  }
}
