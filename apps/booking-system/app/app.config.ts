import { bookingsBookingsConfig } from '../layers/bookings/collections/bookings/app/composables/useBookingsBookings'
import { bookingsLocationsConfig } from '../layers/bookings/collections/locations/app/composables/useBookingsLocations'
import { bookingsSettingsConfig } from '../layers/bookings/collections/settings/app/composables/useBookingsSettings'
import { bookingsEmailtemplatesConfig } from '../layers/bookings/collections/emailtemplates/app/composables/useBookingsEmailtemplates'
import { bookingsEmaillogsConfig } from '../layers/bookings/collections/emaillogs/app/composables/useBookingsEmaillogs'

export default defineAppConfig({
  croutonCollections: {
    bookingsEmaillogs: bookingsEmaillogsConfig,
    bookingsEmailtemplates: bookingsEmailtemplatesConfig,
    bookingsSettings: bookingsSettingsConfig,
    bookingsLocations: bookingsLocationsConfig,
    bookingsBookings: bookingsBookingsConfig,
  }
})
