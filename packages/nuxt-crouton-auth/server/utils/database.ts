/**
 * Database utilities for nuxt-crouton-auth
 *
 * Provides useDB() and table exports for API handlers.
 * Uses NuxtHub v0.10+ db from 'hub:db' (Drizzle ORM instance)
 */
import * as schema from '../database/schema'

// Export commonly used query builder functions
export { eq, and, or, ne, not, lt, gt, asc, desc, count } from 'drizzle-orm'

// Export schema as tables for easy access
export const tables = schema

// NuxtHub v0.10+ provides 'db' from 'hub:db' as an auto-import
declare const db: any

/**
 * Get a Drizzle database instance
 *
 * Uses NuxtHub v0.10+ db from 'hub:db'
 *
 * @example
 * ```typescript
 * const database = useDB()
 * const domains = await database.select().from(tables.domain).where(eq(tables.domain.organizationId, orgId))
 * ```
 */
export function useDB() {
  return db
}

/**
 * Generate a random alphanumeric verification code
 *
 * @param length - Length of the code (default: 32)
 * @returns Random alphanumeric string
 */
export function generateVerificationToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    // randomValues[i] is guaranteed to exist since we created the array with exact length
    result += chars[(randomValues[i] as number) % chars.length]
  }
  return result
}
