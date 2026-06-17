import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'
import { blogPostsConfig } from '../layers/blog/collections/posts/app/composables/useBlogPosts'

export default defineAppConfig({
  // Translations UI is the collection crouton-i18n always registers; `blogPosts`
  // is the blog POC's first app-owned collection, generated via the crouton CLI.
  croutonCollections: {
    translationsUi: translationsUiConfig,
    blogPosts: blogPostsConfig
  }
})
