export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  // Layers - based on crouton.config.js features
  // IMPORTANT: Framework packages first, then local layers at the end
  extends: [
    '@fyit/crouton-i18n',
    '@fyit/crouton-ai',
    '@fyit/crouton-core',
    '@fyit/crouton-auth',
    '@fyit/crouton-admin',
    '@fyit/crouton-editor',
    '@fyit/crouton-pages',
    '@fyit/crouton-bookings',
    // Local layers must come last to override framework defaults
    './layers/bookings',
    './layers/pages'
  ],

  modules: [
    '@fyit/crouton',
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
