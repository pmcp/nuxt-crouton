import { getCroutonLayers } from '@fyit/crouton'

// Define crouton options once, use for both extends and module config
const croutonOptions = {
  // bookings: true,  // Needs local collections - skipping for minimal test
  // email: true
}

export default defineNuxtConfig({
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  // Layers must be added here BEFORE modules load
  extends: getCroutonLayers(croutonOptions),

  modules: [
    '@fyit/crouton',
    '@nuxthub/core',
    '@nuxt/ui'
  ],

  // Module validates that layers match this config
  crouton: croutonOptions,

  // Auth configuration
  croutonAuth: {
    methods: {
      credentials: true
    }
  },

  hub: { db: 'sqlite' }
})
