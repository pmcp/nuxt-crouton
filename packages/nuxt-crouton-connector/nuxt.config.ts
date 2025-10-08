import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-connector',
    description: 'Pre-built connectors for external auth systems and user management'
  },

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-connector']
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
  }
})