import { bookingsLocationsConfig } from '../layers/bookings/collections/locations/app/composables/useBookingsLocations'
import { bookingsBookingsConfig } from '../layers/bookings/collections/bookings/app/composables/useBookingsBookings'
import { bookingsSettingsConfig } from '../layers/bookings/collections/settings/app/composables/useBookingsSettings'
import { translationsUiConfig } from '@friendlyinternet/nuxt-crouton-i18n/app/composables/useTranslationsUi'

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    bookingsSettings: bookingsSettingsConfig,
    bookingsBookings: bookingsBookingsConfig,
    bookingsLocations: bookingsLocationsConfig,
  }
})
