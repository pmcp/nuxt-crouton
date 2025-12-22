import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/crouton-bookings', './layers/bookings']

  // i18n module for automatic locale merging
  modules: ['@nuxtjs/i18n'],

  $meta: {
    description: 'Booking system layer for Nuxt Crouton - slot-based and inventory-based reservations',
    name: 'crouton-bookings'
  },

  // Component configuration - prefixed with CroutonBooking
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonBooking',
        global: true
      }
    ]
  },

  // Auto-import composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
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
