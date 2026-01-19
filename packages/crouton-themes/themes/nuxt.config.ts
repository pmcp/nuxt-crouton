import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Theme switching utilities for Nuxt UI',
    name: 'nuxt-crouton-themes/themes'
  },

  // Register theme components globally (no prefix to match nuxt-crouton stub)
  components: {
    dirs: [
      {
        path: join(currentDir, 'components'),
        global: true
      }
    ]
  },

  // Auto-import composables
  imports: {
    dirs: [join(currentDir, 'composables')]
  }
})