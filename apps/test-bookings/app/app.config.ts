import { bookingsLocationsConfig } from '../layers/bookings/collections/locations/app/composables/useBookingsLocations'
import { bookingsBookingsConfig } from '../layers/bookings/collections/bookings/app/composables/useBookingsBookings'
import { bookingsSettingsConfig } from '../layers/bookings/collections/settings/app/composables/useBookingsSettings'
import { translationsUiConfig } from '@friendlyinternet/nuxt-crouton-i18n/app/composables/useTranslationsUi'
import { bookingsEmailtemplatesConfig } from '../layers/bookings/collections/emailtemplates/app/composables/useBookingsEmailtemplates'
import { bookingsEmaillogsConfig } from '../layers/bookings/collections/emaillogs/app/composables/useBookingsEmaillogs'
import { pagesPagesConfig } from '../layers/pages/collections/pages/app/composables/usePagesPages'

export default defineAppConfig({
  croutonCollections: {
    pagesPages: {
      ...pagesPagesConfig,
      kanban: {
        groupField: 'status',
        columns: [
          { value: 'draft', label: 'Draft', color: 'warning' },
          { value: 'published', label: 'Published', color: 'success' },
          { value: 'archived', label: 'Archived', color: 'neutral' }
        ]
      }
    },
    bookingsEmaillogs: bookingsEmaillogsConfig,
    bookingsEmailtemplates: bookingsEmailtemplatesConfig,
    translationsUi: translationsUiConfig,
    bookingsSettings: bookingsSettingsConfig,
    bookingsBookings: bookingsBookingsConfig,
    bookingsLocations: bookingsLocationsConfig,
  }
})
