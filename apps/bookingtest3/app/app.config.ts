import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {bookingsBookingsConfig} from '../layers/bookings/collections/bookings/app/composables/useBookingsBookings';

import {bookingsLocationsConfig} from '../layers/bookings/collections/locations/app/composables/useBookingsLocations';

import {bookingsSettingsConfig} from '../layers/bookings/collections/settings/app/composables/useBookingsSettings';

import {pagesPagesConfig} from '../layers/pages/collections/pages/app/composables/usePagesPages';

import {bookingtest3BookingRequestsConfig} from '../layers/bookingtest3/collections/bookingrequests/app/composables/useBookingtest3BookingRequests';

import {bookingtest3EquipmentsConfig} from '../layers/bookingtest3/collections/equipments/app/composables/useBookingtest3Equipments';

import {bookingtest3RoomTypesConfig} from '../layers/bookingtest3/collections/roomtypes/app/composables/useBookingtest3RoomTypes';

import {bookingtest3DepartmentsConfig} from '../layers/bookingtest3/collections/departments/app/composables/useBookingtest3Departments';

import {bookingtest3MembersConfig} from '../layers/bookingtest3/collections/members/app/composables/useBookingtest3Members';

import {croutonAssetsConfig} from '../layers/crouton/collections/assets/app/composables/useCroutonAssets';

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    bookingsBookings: bookingsBookingsConfig,
    bookingsLocations: bookingsLocationsConfig,
    bookingsSettings: bookingsSettingsConfig,
    pagesPages: pagesPagesConfig,
    bookingtest3BookingRequests: bookingtest3BookingRequestsConfig,
    bookingtest3Equipments: bookingtest3EquipmentsConfig,
    bookingtest3RoomTypes: bookingtest3RoomTypesConfig,
    bookingtest3Departments: bookingtest3DepartmentsConfig,
    bookingtest3Members: bookingtest3MembersConfig,
    croutonAssets: croutonAssetsConfig
  }
})