// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package
export * from '@fyit/crouton-auth/server/database/schema/auth'
export { bookingsLocations } from '../../layers/bookings/collections/locations/server/database/schema'
export { bookingsBookings } from '../../layers/bookings/collections/bookings/server/database/schema'
export { bookingsSettings } from '../../layers/bookings/collections/settings/server/database/schema'
export { pagesPages } from '../../layers/pages/collections/pages/server/database/schema'
export * from './translations-ui'
