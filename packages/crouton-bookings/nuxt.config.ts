import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-i18n', '@friendlyinternet/crouton-bookings', './layers/bookings']

  // i18n module is provided by nuxt-crouton-i18n layer
  // No need to declare it here - just provide locale files

  $meta: {
    description: 'Booking system layer for Nuxt Crouton - slot-based and inventory-based reservations',
    name: 'crouton-bookings'
  },

  // Component configuration - prefixed with CroutonBooking
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonBookings',
        global: true
      }
    ]
  },

  // Auto-import composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Auto-import server utilities
  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    }
  },

  // Runtime config with email module options
  runtimeConfig: {
    // Server-only config
    croutonBookings: {
      email: {
        enabled: false // Set to true to enable email features
      }
    },
    // Public config
    public: {
      croutonBookings: {
        email: {
          enabled: false // Mirror for client-side awareness
        }
      }
    }
  },

  // i18n configuration - translations auto-merge when this layer is extended
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' }
    ],
    langDir: '../i18n/locales'
  }
})
