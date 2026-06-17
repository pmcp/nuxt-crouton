import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

export default defineAppConfig({
  // No app-owned collections yet — the blog POC starts empty. Translations UI is
  // the one collection crouton-i18n always registers; app workstreams add their
  // own collections here as they generate them via the crouton CLI.
  croutonCollections: {
    translationsUi: translationsUiConfig
  }
})
