import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-themes/ko',
    description: 'KO II hardware-inspired theme for Nuxt UI'
  },

  css: [join(currentDir, 'assets/css/main.css')],

  // Optional: Include custom KO components (Led, Knob, Panel, etc.)
  components: {
    dirs: [
      {
        path: join(currentDir, 'components'),
        prefix: 'Ko',
        global: true
      }
    ]
  }
})
