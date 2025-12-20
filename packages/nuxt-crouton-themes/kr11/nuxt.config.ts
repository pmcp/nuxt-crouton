import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Korg KR-11 Compact Rhythm Box inspired theme for Nuxt UI',
    name: 'nuxt-crouton-themes/kr11'
  },

  components: {
    dirs: [
      {
        path: join(currentDir, 'components'),
        prefix: 'Kr',
        global: true
      }
    ]
  },

  css: [join(currentDir, 'assets/css/main.css')]
})
