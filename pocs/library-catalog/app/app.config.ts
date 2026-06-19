import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

export default defineAppConfig({
  // Translations UI is the collection crouton-i18n always registers.
  // Library catalog collections (books, authors, genres, borrowings) will be
  // added by subsequent sub-issues via the crouton CLI.
  croutonCollections: {
    translationsUi: translationsUiConfig
  }
})
