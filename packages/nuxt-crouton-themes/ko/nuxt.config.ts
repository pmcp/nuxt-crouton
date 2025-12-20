import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'KO II hardware-inspired theme for Nuxt UI',
    name: 'nuxt-crouton-themes/ko'
  },

  // Optional: Include custom KO components (Led, Knob, Panel, etc.)
  components: {
    dirs: [
      {
        path: join(currentDir, 'components'),
        prefix: 'Ko',
        global: true
      }
    ]
  },

  css: [join(currentDir, 'assets/css/main.css')]
})
