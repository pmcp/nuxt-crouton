/**
 * Database Utilities for Admin API
 *
 * Provides access to the Drizzle database instance for admin queries.
 * Uses NuxtHub's hubDatabase() for D1 binding.
 */
import { drizzle } from 'drizzle-orm/d1'

// Declare hubDatabase as it's a global from NuxtHub
// D1Database is from @cloudflare/workers-types
declare function hubDatabase(): import('@cloudflare/workers-types').D1Database

// Re-export schema from crouton-auth
export {
  user,
  session,
  account,
  organization,
  member,
} from '../../../crouton-auth/server/database/schema/auth'

/**
 * Get Drizzle database instance
 *
 * @returns Drizzle database instance connected to NuxtHub D1
 */
export function useAdminDb() {
  const d1 = hubDatabase()
  return drizzle(d1)
}

export type AdminDb = ReturnType<typeof useAdminDb>
