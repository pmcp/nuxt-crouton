import { defineExternalCollection } from '@friendlyinternet/nuxt-crouton/app/composables/useExternalCollection'
import type { ZodSchema } from 'zod'

/**
 * Configuration for NuxSaaS connector
 */
export interface NuxsaasConnectorConfig {
  /**
   * The source endpoint in NuxSaaS (usually 'admin/users')
   */
  sourceEndpoint?: string

  /**
   * Zod schema for user validation
   */
  schema: ZodSchema

  /**
   * Transform function to convert NuxSaaS user to Crouton format
   * The 'title' field is required for CroutonReferenceSelect
   */
  transform: (user: any) => {
    id: string
    title: string
    [key: string]: any
  }

  /**
   * Default filters to apply
   */
  defaultFilters?: {
    /**
     * Include banned users (default: false)
     */
    includeBanned?: boolean

    /**
     * Filter by role
     */
    role?: string
  }
}

/**
 * Connect NuxSaaS users to nuxt-crouton
 *
 * This connector provides admin-level access to all users in NuxSaaS.
 * It integrates with better-auth and PostgreSQL.
 *
 * @example
 * ```typescript
 * import { connectNuxsaas } from '@friendlyinternet/nuxt-crouton-supersaas/nuxsaas'
 * import { z } from 'zod'
 *
 * const userSchema = z.object({
 *   id: z.string().uuid(),
 *   title: z.string(),
 *   email: z.string(),
 *   image: z.string().optional(),
 *   role: z.string().optional(),
 *   subscriptionStatus: z.string().optional()
 * })
 *
 * export default defineAppConfig({
 *   croutonCollections: {
 *     users: connectNuxsaas({
 *       schema: userSchema,
 *       transform: (user) => ({
 *         id: user.id,
 *         title: user.name,
 *         email: user.email,
 *         image: user.image,
 *         role: user.role,
 *         subscriptionStatus: user.subscriptionStatus
 *       }),
 *       defaultFilters: {
 *         includeBanned: false
 *       }
 *     })
 *   }
 * })
 * ```
 */
export function connectNuxsaas(config: NuxsaasConnectorConfig) {
  const sourceEndpoint = config.sourceEndpoint || 'admin/users'

  return defineExternalCollection({
    name: 'users',
    apiPath: sourceEndpoint,
    fetchStrategy: 'query',
    readonly: true,
    schema: config.schema,
    proxy: {
      enabled: true,
      sourceEndpoint,
      transform: config.transform
    },
    meta: {
      label: 'Users',
      description: 'Users from NuxSaaS authentication system',
      defaultFilters: config.defaultFilters
    }
  })
}

/**
 * Type for NuxSaaS user with subscription data
 */
export interface NuxsaasUser {
  id: string
  name: string
  email: string
  image?: string | null
  role?: string | null
  banned?: boolean | null
  emailVerified?: boolean
  stripeCustomerId?: string | null
  polarCustomerId?: string | null
  subscriptionStatus?: 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due' | null
  subscriptionTier?: string | null
}