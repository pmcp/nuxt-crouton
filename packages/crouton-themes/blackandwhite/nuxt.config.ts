import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Compact monochrome dashboard theme for Nuxt UI',
    name: 'nuxt-crouton-themes/blackandwhite'
  },

  css: [join(currentDir, 'assets/css/main.css')]
})
