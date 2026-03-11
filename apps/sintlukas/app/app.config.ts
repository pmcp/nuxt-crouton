import { contentCategoriesConfig } from '../layers/content/collections/categories/app/composables/useContentCategories'

import {contentAteliersConfig} from '../layers/content/collections/ateliers/app/composables/useContentAteliers';

import {contentPersonsConfig} from '../layers/content/collections/persons/app/composables/useContentPersons';

import {contentLocationsConfig} from '../layers/content/collections/locations/app/composables/useContentLocations';

import {contentNewsConfig} from '../layers/content/collections/news/app/composables/useContentNews';

import {contentDownloadsConfig} from '../layers/content/collections/downloads/app/composables/useContentDownloads';

import {croutonAssetsConfig} from '../layers/crouton/collections/assets/app/composables/useCroutonAssets';

import {pagesPagesConfig} from '../layers/pages/collections/pages/app/composables/usePagesPages';

import {translationsUiConfig} from '@fyit/crouton-i18n/app/composables/useTranslationsUi';

export default defineAppConfig({
  croutonCollections: {
    contentCategories: contentCategoriesConfig,
    contentAteliers: contentAteliersConfig,
    contentPersons: contentPersonsConfig,
    contentLocations: contentLocationsConfig,
    contentNews: contentNewsConfig,
    contentDownloads: contentDownloadsConfig,
    croutonAssets: croutonAssetsConfig,
    pagesPages: pagesPagesConfig,
    translationsUi: translationsUiConfig
  }
})