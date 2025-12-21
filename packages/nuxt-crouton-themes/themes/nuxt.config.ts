import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Theme switching utilities for Nuxt UI',
    name: 'nuxt-crouton-themes/themes'
  },

  // Register ThemeToggle component
  components: {
    dirs: [
      {
        path: join(currentDir, 'components'),
        prefix: 'Theme',
        global: true
      }
    ]
  },

  // Auto-import composables
  imports: {
    dirs: [join(currentDir, 'composables')]
  }
})