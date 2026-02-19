import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Theme switching utilities for Nuxt UI',
    name: 'nuxt-crouton-themes/themes'
  },

  // Pull in all individual theme layers — apps only need to extend this one entry
  extends: [
    join(currentDir, '../ko'),
    join(currentDir, '../minimal'),
    join(currentDir, '../kr11')
  ],

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
  },

  // Plugin that provides theme state via inject for cross-layer communication
  plugins: [join(currentDir, 'plugins/themeProvider.client')]
})