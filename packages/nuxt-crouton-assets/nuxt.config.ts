import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Asset management addon layer for nuxt-crouton with centralized media library',
    name: 'nuxt-crouton-assets'
  },

  // Note: This is an addon layer - users must explicitly extend both:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-assets']
  // And ensure NuxtHub blob storage is enabled: hub: { blob: true }

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonAssets',
        global: true
      }
    ]
  },

  // Composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  }
})
