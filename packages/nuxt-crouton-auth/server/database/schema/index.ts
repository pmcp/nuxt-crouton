/**
 * @crouton/auth Database Schema
 *
 * Re-exports all Better Auth database tables and relations for Drizzle.
 * Import this file to get all auth-related schema definitions.
 *
 * @example
 * ```typescript
 * import * as authSchema from '@crouton/auth/server/database/schema'
 *
 * // Use with Drizzle
 * const db = drizzle(client, { schema: { ...authSchema } })
 * ```
 */
export * from './auth'
