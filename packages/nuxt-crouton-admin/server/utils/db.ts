/**
 * Database Utilities for Admin API
 *
 * Provides access to the Drizzle database instance for admin queries.
 * Uses NuxtHub's hubDatabase() for D1 binding.
 *
 * IMPORTANT: This file re-exports the schema from crouton-auth.
 * Since crouton-admin extends crouton-auth, the schema types are available.
 */
import { drizzle } from 'drizzle-orm/d1'
import * as authSchema from '@friendlyinternet/nuxt-crouton-auth/server/database/schema/auth'

// Declare hubDatabase as it's a global from NuxtHub
// D1Database is from @cloudflare/workers-types
declare function hubDatabase(): import('@cloudflare/workers-types').D1Database

// Re-export schema from crouton-auth
export const user = authSchema.user
export const session = authSchema.session
export const account = authSchema.account
export const organization = authSchema.organization
export const member = authSchema.member

// Export types for convenience
export type User = typeof authSchema.user.$inferSelect
export type Session = typeof authSchema.session.$inferSelect
export type Account = typeof authSchema.account.$inferSelect
export type Organization = typeof authSchema.organization.$inferSelect
export type Member = typeof authSchema.member.$inferSelect

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
