import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {mainItemsConfig} from '../layers/main/collections/items/app/composables/useMainItems';

import {pagesPagesConfig} from '../layers/pages/collections/pages/app/composables/usePagesPages';

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    mainItems: mainItemsConfig,
    pagesPages: pagesPagesConfig
  }
})