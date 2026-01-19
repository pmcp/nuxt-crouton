import { playgroundTagsConfig } from '../layers/playground/collections/tags/app/composables/usePlaygroundTags'
import { playgroundCategoriesConfig } from '../layers/playground/collections/categories/app/composables/usePlaygroundCategories'
import { playgroundPostsConfig } from '../layers/playground/collections/posts/app/composables/usePlaygroundPosts'
import { playgroundDecisionsConfig } from '../layers/playground/collections/decisions/app/composables/usePlaygroundDecisions'
import { playgroundOptionsConfig } from '../layers/playground/collections/options/app/composables/usePlaygroundOptions'
import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    playgroundOptions: playgroundOptionsConfig,
    playgroundDecisions: playgroundDecisionsConfig,
    playgroundPosts: playgroundPostsConfig,
    playgroundCategories: playgroundCategoriesConfig,
    playgroundTags: playgroundTagsConfig,
  },
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    }
  }
})
