import { translationsUiConfig } from '@friendlyinternet/nuxt-crouton-i18n/app/composables/useTranslationsUi'
import { bookingsEmailtemplatesConfig } from '../layers/bookings/collections/emailtemplates/app/composables/useBookingsEmailtemplates'
import { bookingsEmaillogsConfig } from '../layers/bookings/collections/emaillogs/app/composables/useBookingsEmaillogs'

export default defineAppConfig({
  croutonCollections: {
    bookingsEmaillogs: bookingsEmaillogsConfig,
    bookingsEmailtemplates: bookingsEmailtemplatesConfig,
    translationsUi: translationsUiConfig,
  }
})
