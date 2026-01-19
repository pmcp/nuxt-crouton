import { getCroutonLayers } from '@fyit/crouton'

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  // Layers - based on crouton.config.js features
  extends: [
    ...getCroutonLayers(),
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
