/**
 * Database Utilities for Admin API
 *
 * Provides access to the Drizzle database instance for admin queries.
 * Uses NuxtHub 0.10+ auto-imported `db` from `hub:db`.
 *
 * IMPORTANT: This file re-exports the schema from crouton-auth.
 * Since crouton-admin extends crouton-auth, the schema types are available.
 */
import * as authSchema from '@fyit/crouton-auth/server/database/schema/auth'

// NuxtHub v0.10+ provides 'db' from 'hub:db' as an auto-import
declare const db: any

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
 * @returns Drizzle database instance from NuxtHub
 */
export function useAdminDb() {
  if (typeof db === 'undefined' || db === null) {
    throw new Error('[crouton/admin] No database available. Ensure NuxtHub is configured with hub.db')
  }
  return db
}

export type AdminDb = ReturnType<typeof useAdminDb>
