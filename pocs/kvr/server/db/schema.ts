// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package
export * from '@fyit/crouton-auth/server/database/schema/auth'
export { kvrSettings } from '../../layers/kvr/collections/settings/server/database/schema'
export { kvrWerkvergunningens } from '../../layers/kvr/collections/werkvergunningens/server/database/schema'
export * from './translations-ui'
