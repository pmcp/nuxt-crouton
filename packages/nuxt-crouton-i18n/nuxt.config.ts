import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({

  // Note: This is an addon layer - users must explicitly extend both:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-i18n']

  // Add i18n module
  modules: ['@nuxtjs/i18n'],
  $meta: {
    description: 'i18n addon layer for FYIT collections',
    name: 'nuxt-crouton-i18n'
  },

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonI18n',
        global: true
      }
    ]
  },

  // Composables
  imports: {
    dirs: [join(currentDir, 'app/composables')],
    // Explicitly override useT from nuxt-crouton stub with our full implementation
    imports: [
      {
        name: 'useT',
        from: join(currentDir, 'app/composables/useT'),
        priority: 10 // Higher priority to override the stub
      }
    ]
  },

  // i18n configuration
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: '../locales', // Relative to srcDir (app/)
    defaultLocale: 'en',
    strategy: 'prefix' // All URLs include locale prefix (e.g., /en/acme/about, /fr/acme/a-propos)
  }
})
