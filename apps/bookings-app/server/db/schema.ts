// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package (includes teamSettings)
export * from '@fyit/crouton-auth/server/database/schema/auth'
export * from './translations-ui'
export { bookingsAppExt:bookings:bookings } from '../../layers/bookings-app/collections/__ext:bookings:bookings/server/database/schema'
export { bookingsAppPromotions } from '../../layers/bookings-app/collections/promotions/server/database/schema'
export { bookingsAppReviews } from '../../layers/bookings-app/collections/reviews/server/database/schema'
export { bookingsAppStaffs } from '../../layers/bookings-app/collections/staffs/server/database/schema'
export { bookingsAppServices } from '../../layers/bookings-app/collections/services/server/database/schema'
export { bookingsAppCustomers } from '../../layers/bookings-app/collections/customers/server/database/schema'
export { bookingsBookings } from '../../layers/bookings/collections/bookings/server/database/schema'
export { bookingsLocations } from '../../layers/bookings/collections/locations/server/database/schema'
export { bookingsSettings } from '../../layers/bookings/collections/settings/server/database/schema'
export { pagesPages } from '../../layers/pages/collections/pages/server/database/schema'
