import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {bookingsBookingsConfig} from '../layers/bookings/collections/bookings/app/composables/useBookingsBookings';

import {bookingsLocationsConfig} from '../layers/bookings/collections/locations/app/composables/useBookingsLocations';

import {bookingsSettingsConfig} from '../layers/bookings/collections/settings/app/composables/useBookingsSettings';

import {pagesPagesConfig} from '../layers/pages/collections/pages/app/composables/usePagesPages';


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
    croutonAssets: croutonAssetsConfig,
    bookingsEmailtemplates: bookingsEmailtemplatesConfig,
    bookingsEmaillogs: bookingsEmaillogsConfig
  },
  // Backend-free demo blocks for the /builder preview (epic #868) — both reuse the
  // generic KPI block under DISTINCT ids so the collapse demo can collapse one pane
  // and reflow the other (collapse is keyed by blockId). defu-merged with the
  // crouton-layout defaults; not used by velo's product.
  croutonLayoutBlocks: {
    'demo-a': { id: 'demo-a', name: 'Overview', description: 'Demo KPIs', icon: 'i-lucide-bar-chart-3', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 40 },
    'demo-b': { id: 'demo-b', name: 'Detail', description: 'Demo KPIs', icon: 'i-lucide-bar-chart-3', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 60 },
  }
})