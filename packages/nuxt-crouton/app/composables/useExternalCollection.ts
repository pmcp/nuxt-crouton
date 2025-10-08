import type { z } from 'zod'

/**
 * Configuration for an external collection
 * Used when you want Crouton forms to reference collections
 * managed by another system (e.g., auth system users, external APIs)
 */
export interface ExternalCollectionConfig {
  /** Collection name (must match app.config.ts key) */
  name: string
  /** Zod schema for validation and types */
  schema: z.ZodSchema
  /** API path (defaults to collection name) */
  apiPath?: string
  /** Fetch strategy for single items - 'query' uses ?ids=, 'restful' uses /{id} (defaults to 'query') */
  fetchStrategy?: 'query' | 'restful'
  /** Read-only collection - hides edit/delete buttons in CardMini (defaults to true) */
  readonly?: boolean
  /** Optional metadata for display */
  meta?: {
    label?: string
    description?: string
  }
  /** Proxy configuration for connecting to existing endpoints */
  proxy?: {
    /** Enable proxy mode */
    enabled: boolean
    /** Source endpoint to proxy to (e.g., 'members' → /api/teams/[id]/members) */
    sourceEndpoint: string
    /** Transform function to convert source data to Crouton format */
    transform: (item: any) => { id: string; title: string; [key: string]: any }
  }
}

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
 * @returns Collection config compatible with Crouton registry
 */
export function defineExternalCollection(config: ExternalCollectionConfig) {
  return {
    name: config.name,
    layer: 'external',
    apiPath: config.apiPath || config.name,
    fetchStrategy: config.fetchStrategy || 'query', // Default to query-based for backward compatibility
    readonly: config.readonly !== false, // Default to true (read-only) unless explicitly set to false
    componentName: null, // No form component - external collections are read-only
    schema: config.schema,
    defaultValues: {},
    columns: [],
    meta: config.meta || {},
    proxy: config.proxy // Pass through proxy config
  }
}
