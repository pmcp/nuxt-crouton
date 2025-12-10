import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton',
    description: 'Base CRUD layer for FYIT collections'
  },

  modules: ['@nuxt/ui', '@vueuse/nuxt'],

  css: [join(currentDir, 'app/assets/css/utilities.css')],

  plugins: [
    { src: join(currentDir, 'app/plugins/tree-styles.client.ts'), mode: 'client' }
  ],

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

  // Make registry available and auto-import server utils
  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    },
    alias: {
      '#crouton/registry': './registry',
      '#crouton/team-auth': join(currentDir, 'server/utils/team-auth')
    }
  }
})
