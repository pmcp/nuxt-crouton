import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {bookingsAppPromotionsConfig} from '../layers/bookings-app/collections/promotions/app/composables/useBookingsAppPromotions';

import {bookingsAppReviewsConfig} from '../layers/bookings-app/collections/reviews/app/composables/useBookingsAppReviews';

import {bookingsAppStaffsConfig} from '../layers/bookings-app/collections/staffs/app/composables/useBookingsAppStaffs';

import {bookingsAppServicesConfig} from '../layers/bookings-app/collections/services/app/composables/useBookingsAppServices';

import {bookingsAppCustomersConfig} from '../layers/bookings-app/collections/customers/app/composables/useBookingsAppCustomers';

import {bookingsBookingsConfig} from '../layers/bookings/collections/bookings/app/composables/useBookingsBookings';

import {bookingsLocationsConfig} from '../layers/bookings/collections/locations/app/composables/useBookingsLocations';

import {bookingsSettingsConfig} from '../layers/bookings/collections/settings/app/composables/useBookingsSettings';

import {pagesPagesConfig} from '../layers/pages/collections/pages/app/composables/usePagesPages';

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    bookingsAppPromotions: bookingsAppPromotionsConfig,
    bookingsAppReviews: bookingsAppReviewsConfig,
    bookingsAppStaffs: bookingsAppStaffsConfig,
    bookingsAppServices: bookingsAppServicesConfig,
    bookingsAppCustomers: bookingsAppCustomersConfig,
    bookingsBookings: bookingsBookingsConfig,
    bookingsLocations: bookingsLocationsConfig,
    bookingsSettings: bookingsSettingsConfig,
    pagesPages: pagesPagesConfig
  }
})