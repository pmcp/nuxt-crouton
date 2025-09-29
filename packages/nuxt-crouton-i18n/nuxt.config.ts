export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-i18n',
    description: 'i18n addon layer for FYIT collections'
  },

  // Note: This is an addon layer - users must explicitly extend both:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-i18n']

  // Add i18n module
  modules: ['@nuxtjs/i18n'],

  // i18n configuration
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: '../locales',
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