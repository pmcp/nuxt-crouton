import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-sales')) {
  _dependencies.add('crouton-sales')
  console.log('🍞 crouton:sales ✓ Layer loaded')
}

export default defineNuxtConfig({
  // Usage:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/crouton-sales', './layers/sales']

  modules: ['@nuxtjs/i18n'],

  $meta: {
    description: 'POS/Sales system for Nuxt Crouton - products, categories, orders, and optional thermal receipt printing',
    name: 'crouton-sales'
  },

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Sales',
        global: true
      }
    ]
  },

  // Composables auto-import
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // i18n configuration
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' }
    ],
    langDir: '../i18n/locales',
    defaultLocale: 'en',
    strategy: 'no_prefix'
  }
})
