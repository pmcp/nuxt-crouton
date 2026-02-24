// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package (includes teamSettings)
export * from '@fyit/crouton-auth/server/database/schema/auth'
export * from './translations-ui'
export { bookingsBookings } from '../../layers/bookings/collections/bookings/server/database/schema'
export { bookingsLocations } from '../../layers/bookings/collections/locations/server/database/schema'
export { bookingsSettings } from '../../layers/bookings/collections/settings/server/database/schema'
export { pagesPages } from '../../layers/pages/collections/pages/server/database/schema'
export { bookingtest3BookingRequests } from '../../layers/bookingtest3/collections/bookingrequests/server/database/schema'
export { bookingtest3Equipments } from '../../layers/bookingtest3/collections/equipments/server/database/schema'
export { bookingtest3RoomTypes } from '../../layers/bookingtest3/collections/roomtypes/server/database/schema'
export { bookingtest3Departments } from '../../layers/bookingtest3/collections/departments/server/database/schema'
export { bookingtest3Members } from '../../layers/bookingtest3/collections/members/server/database/schema'
export { croutonAssets } from '../../layers/crouton/collections/assets/server/database/schema'
