import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

import {blogPostsConfig} from '../layers/blog/collections/posts/app/composables/useBlogPosts';

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    blogPosts: blogPostsConfig
  }
})