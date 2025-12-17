/**
 * Type declarations for #crouton/team-auth Nitro alias
 *
 * This module re-exports team-based authentication utilities from @crouton/auth.
 * The actual implementation uses Better Auth under the hood.
 */
declare module '#crouton/team-auth' {
  // Re-export all types and functions from @crouton/auth
  export * from '@friendlyinternet/crouton-auth/server/utils/team-auth'
}
