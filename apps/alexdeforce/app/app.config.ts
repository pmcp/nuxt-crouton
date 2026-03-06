import { contentArticlesConfig } from '../layers/content/collections/articles/app/composables/useContentArticles'

import {contentAgendasConfig} from '../layers/content/collections/agendas/app/composables/useContentAgendas';

import {pagesPagesConfig} from '../layers/pages/collections/pages/app/composables/usePagesPages';

import {translationsUiConfig} from '@fyit/crouton-i18n/app/composables/useTranslationsUi';

export default defineAppConfig({
  croutonCollections: {
    contentArticles: contentArticlesConfig,
    contentAgendas: contentAgendasConfig,
    pagesPages: pagesPagesConfig,
    translationsUi: translationsUiConfig
  }
})