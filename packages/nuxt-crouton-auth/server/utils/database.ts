/**
 * Database utilities for nuxt-crouton-auth
 *
 * Provides useDB() and table exports for API handlers.
 * Uses Drizzle ORM with D1 database.
 */
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'

// Export commonly used query builder functions
export { eq, and, or, ne, not, lt, gt, asc, desc, count } from 'drizzle-orm'

// Export schema as tables for easy access
export const tables = schema

/**
 * Get a Drizzle database instance
 *
 * Uses NuxtHub's hubDatabase() to get the D1 binding.
 *
 * @example
 * ```typescript
 * const db = useDB()
 * const domains = await db.select().from(tables.domain).where(eq(tables.domain.organizationId, orgId))
 * ```
 */
export function useDB() {
  return drizzle(hubDatabase(), { schema })
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
    result += chars[randomValues[i] % chars.length]
  }
  return result
}
