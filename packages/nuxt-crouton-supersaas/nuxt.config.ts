import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-supersaas',
    description: 'SuperSaaS integration layer for Nuxt Crouton - connectors, translations, and utilities'
  },

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-supersaas']
  // Or copy connector files directly to their project for customization

  // i18n module for automatic locale merging
  modules: ['@nuxtjs/i18n'],

  // i18n configuration - translations auto-merge when this layer is extended
  // langDir is relative to srcDir (app/)
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: '../i18n/locales'
  },

  // Component configuration (if we add shared components later)
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonConnector',
        global: true
      }
    ]
  },

  // Composables (if we add shared utilities later)
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  }
})