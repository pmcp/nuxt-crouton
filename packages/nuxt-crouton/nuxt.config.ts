import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton',
    description: 'Base CRUD layer for FYIT collections'
  },

  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Crouton',
        global: true
      }
    ]
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Make registry available
  nitro: {
    alias: {
      '#crouton/registry': './registry'
    }
  }
})