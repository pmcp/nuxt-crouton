import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Clean, minimalist theme with black lines on white background',
    name: 'nuxt-crouton-themes/minimal'
  },

  css: [join(currentDir, 'assets/css/main.css')]
})
