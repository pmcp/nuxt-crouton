import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {bookingsBookingsConfig} from '../layers/bookings/collections/bookings/app/composables/useBookingsBookings';

import {bookingsLocationsConfig} from '../layers/bookings/collections/locations/app/composables/useBookingsLocations';

import {bookingsSettingsConfig} from '../layers/bookings/collections/settings/app/composables/useBookingsSettings';

import {pagesPagesConfig} from '../layers/pages/collections/pages/app/composables/usePagesPages';

import {bikeshedBookingRequestsConfig} from '../layers/bikeshed/collections/bookingrequests/app/composables/useBikeshedBookingRequests';

import {bikeshedEquipmentsConfig} from '../layers/bikeshed/collections/equipments/app/composables/useBikeshedEquipments';

import {bikeshedRoomTypesConfig} from '../layers/bikeshed/collections/roomtypes/app/composables/useBikeshedRoomTypes';

import {bikeshedDepartmentsConfig} from '../layers/bikeshed/collections/departments/app/composables/useBikeshedDepartments';

import {bikeshedMembersConfig} from '../layers/bikeshed/collections/members/app/composables/useBikeshedMembers';

import {croutonAssetsConfig} from '../layers/crouton/collections/assets/app/composables/useCroutonAssets';

import {bookingsEmailtemplatesConfig} from '../layers/bookings/collections/emailtemplates/app/composables/useBookingsEmailtemplates';

import {bookingsEmaillogsConfig} from '../layers/bookings/collections/emaillogs/app/composables/useBookingsEmaillogs';

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    bookingsBookings: bookingsBookingsConfig,
    bookingsLocations: bookingsLocationsConfig,
    bookingsSettings: bookingsSettingsConfig,
    pagesPages: pagesPagesConfig,
    bikeshedBookingRequests: bikeshedBookingRequestsConfig,
    bikeshedEquipments: bikeshedEquipmentsConfig,
    bikeshedRoomTypes: bikeshedRoomTypesConfig,
    bikeshedDepartments: bikeshedDepartmentsConfig,
    bikeshedMembers: bikeshedMembersConfig,
    croutonAssets: croutonAssetsConfig,
    bookingsEmailtemplates: bookingsEmailtemplatesConfig,
    bookingsEmaillogs: bookingsEmaillogsConfig
  }
})