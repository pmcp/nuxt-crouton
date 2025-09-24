export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-translations',
    description: 'Translations layer for FYIT collections'
  },

  // Extend the base crouton layer
  extends: [
    '@fyit/nuxt-crouton'
  ],

  // Add i18n module
  modules: ['@nuxtjs/i18n'],

  // i18n configuration
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: 'locales',
    defaultLocale: 'en',
    strategy: 'no_prefix'
  },

  // Component configuration
  components: {
    dirs: [
      {
        path: './app/components',
        prefix: 'Translations',
        global: true
      }
    ]
  },

  // Composables
  imports: {
    dirs: ['./app/composables']
  }
})