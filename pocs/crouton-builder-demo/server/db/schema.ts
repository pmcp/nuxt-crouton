// Database schema exports
// Aggregates the auth schema (crouton-auth), UI translations (crouton-i18n),
// and the generated pages collection so `~~/server/db/schema` resolves the
// `user` table and collection tables used across layers.

// Auth schema from crouton-auth (includes user, teams, teamSettings, userProfile, etc.)
export * from '@fyit/crouton-auth/server/database/schema/auth'
export * from './translations-ui'
export { pagesPages } from '../../layers/pages/collections/pages/server/database/schema'
