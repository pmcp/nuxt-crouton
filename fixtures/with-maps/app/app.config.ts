import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {mainItemsConfig} from '../layers/main/collections/items/app/composables/useMainItems';
import {mainVenuesConfig} from '../layers/main/collections/venues/app/composables/useMainVenues';

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    mainItems: mainItemsConfig,
    mainVenues: mainVenuesConfig
  }
})
