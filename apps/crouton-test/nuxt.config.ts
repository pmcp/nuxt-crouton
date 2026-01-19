export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  // Layers - based on crouton.config.js features
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-auth',
    '@fyit/crouton-admin',
    '@fyit/crouton-i18n',
    '@fyit/crouton-editor',
    '@fyit/crouton-pages',
    '@fyit/crouton-bookings',
    './layers/bookings',
    './layers/pages'
  ],

  modules: [
    '@nuxthub/core',
    '@nuxt/ui'
  ],

  // Auth configuration
  croutonAuth: {
    methods: {
      credentials: true
    }
  },

  hub: { db: 'sqlite' }
})
