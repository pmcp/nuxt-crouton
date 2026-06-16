import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {mainAuthorsConfig} from '../layers/main/collections/authors/app/composables/useMainAuthors';

import {mainBooksConfig} from '../layers/main/collections/books/app/composables/useMainBooks';

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    mainAuthors: mainAuthorsConfig,
    mainBooks: mainBooksConfig
  }
})