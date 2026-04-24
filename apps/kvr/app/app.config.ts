import { kvrSettingsConfig } from '../layers/kvr/collections/settings/app/composables/useKvrSettings'

import {kvrWerkvergunningensConfig} from '../layers/kvr/collections/werkvergunningens/app/composables/useKvrWerkvergunningens';

import {translationsUiConfig} from '@fyit/crouton-i18n/app/composables/useTranslationsUi';

export default defineAppConfig({
  croutonCollections: {
    kvrSettings: kvrSettingsConfig,
    kvrWerkvergunningens: kvrWerkvergunningensConfig,
    translationsUi: translationsUiConfig
  }
})