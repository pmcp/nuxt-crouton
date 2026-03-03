// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package (includes teamSettings)
export * from '@fyit/crouton-auth/server/database/schema/auth'
export * from './translations-ui'
export { bookingsBookings } from '../../layers/bookings/collections/bookings/server/database/schema'
export { bookingsLocations } from '../../layers/bookings/collections/locations/server/database/schema'
export { bookingsSettings } from '../../layers/bookings/collections/settings/server/database/schema'
export { pagesPages } from '../../layers/pages/collections/pages/server/database/schema'
export { bikeshedBookingRequests } from '../../layers/bikeshed/collections/bookingrequests/server/database/schema'
export { bikeshedEquipments } from '../../layers/bikeshed/collections/equipments/server/database/schema'
export { bikeshedRoomTypes } from '../../layers/bikeshed/collections/roomtypes/server/database/schema'
export { bikeshedDepartments } from '../../layers/bikeshed/collections/departments/server/database/schema'
export { bikeshedMembers } from '../../layers/bikeshed/collections/members/server/database/schema'
export { croutonAssets } from '../../layers/crouton/collections/assets/server/database/schema'
export { bookingsEmailtemplates } from '../../layers/bookings/collections/emailtemplates/server/database/schema'
export { bookingsEmaillogs } from '../../layers/bookings/collections/emaillogs/server/database/schema'
