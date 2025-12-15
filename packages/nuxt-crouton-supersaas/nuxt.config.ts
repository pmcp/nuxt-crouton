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
  },

  // i18n configuration - expose locale files to consuming apps
  // Apps can import these via: @friendlyinternet/nuxt-crouton-supersaas/i18n/locales/en.json
  alias: {
    '@crouton-supersaas-locales': join(currentDir, 'i18n/locales')
  }
})