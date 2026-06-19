import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {libraryCatalogAuthorsConfig} from '../layers/library-catalog/collections/authors/app/composables/useLibraryCatalogAuthors';

import {libraryCatalogGenresConfig} from '../layers/library-catalog/collections/genres/app/composables/useLibraryCatalogGenres';

import {libraryCatalogBooksConfig} from '../layers/library-catalog/collections/books/app/composables/useLibraryCatalogBooks';

import {libraryCatalogLoansConfig} from '../layers/library-catalog/collections/loans/app/composables/useLibraryCatalogLoans';

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    libraryCatalogAuthors: libraryCatalogAuthorsConfig,
    libraryCatalogGenres: libraryCatalogGenresConfig,
    libraryCatalogBooks: libraryCatalogBooksConfig,
    libraryCatalogLoans: libraryCatalogLoansConfig
  }
})