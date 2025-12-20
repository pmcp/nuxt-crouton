import { z } from 'zod'
import { defineExternalCollection } from '@friendlyinternet/nuxt-crouton/app/composables/useExternalCollection'

/**
 * NuxSaaS User Schema
 *
 * Schema for users from NuxSaaS authentication system.
 * The 'title' field is required for CroutonReferenceSelect component.
 */
export const nuxsaasUserSchema = z.object({
  /**
   * User ID (UUIDv7 in NuxSaaS)
   */
  id: z.string().uuid(),

  /**
   * User's display name (required for CroutonReferenceSelect)
   * Maps to user.name in NuxSaaS
   */
  title: z.string(),

  /**
   * User's email address
   */
  email: z.string().email(),

  /**
   * User's avatar/profile image URL
   */
  image: z.string().optional(),

  /**
   * User's role (e.g., 'admin', 'user')
   */
  role: z.string().optional(),

  /**
   * Whether the user is banned
   */
  banned: z.boolean().optional(),

  /**
   * Whether the user's email is verified
   */
  emailVerified: z.boolean().optional(),

  /**
   * Subscription status (from Stripe or Polar)
   */
  subscriptionStatus: z
    .enum(['active', 'inactive', 'trialing', 'canceled', 'past_due'])
    .optional(),

  /**
   * Subscription tier/plan name
   */
  subscriptionTier: z.string().optional(),

  /**
   * Stripe customer ID (if using Stripe)
   */
  stripeCustomerId: z.string().optional(),

  /**
   * Polar customer ID (if using Polar)
   */
  polarCustomerId: z.string().optional()
})

/**
 * External collection configuration for NuxSaaS users
 *
 * This can be used in copy-paste mode or as a reference
 * for custom implementations.
 *
 * @example Copy-Paste Mode
 * ```typescript
 * // app/app.config.ts
 * import { usersConfig } from '@friendlyinternet/nuxt-crouton-supersaas/nuxsaas'
 *
 * export default defineAppConfig({
 *   croutonCollections: {
 *     users: usersConfig
 *   }
 * })
 * ```
 *
 * @example Proxy Mode (Recommended)
 * ```typescript
 * // app/app.config.ts
 * import { connectNuxsaas } from '@friendlyinternet/nuxt-crouton-supersaas/nuxsaas'
 * import { nuxsaasUserSchema } from '@friendlyinternet/nuxt-crouton-supersaas/nuxsaas'
 *
 * export default defineAppConfig({
 *   croutonCollections: {
 *     users: connectNuxsaas({
 *       schema: nuxsaasUserSchema,
 *       transform: (user) => ({
 *         id: user.id,
 *         title: user.name,
 *         email: user.email,
 *         image: user.image,
 *         role: user.role,
 *         banned: user.banned,
 *         subscriptionStatus: user.subscriptionStatus
 *       })
 *     })
 *   }
 * })
 * ```
 */
export const usersConfig = defineExternalCollection({
  name: 'users',
  apiPath: 'admin/users',
  fetchStrategy: 'restful',
  readonly: true,
  schema: nuxsaasUserSchema,
  meta: {
    label: 'Users',
    description: 'Users from NuxSaaS authentication system',
    icon: 'i-heroicons-users',
    singularLabel: 'User',
    pluralLabel: 'Users'
  }
})

/**
 * Composable to access NuxSaaS users configuration
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const usersCollection = useUsers()
 * </script>
 * ```
 */
export const useUsers = () => usersConfig

/**
 * Type-safe user type derived from schema
 */
export type NuxsaasUser = z.infer<typeof nuxsaasUserSchema>
