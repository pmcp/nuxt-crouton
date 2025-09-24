export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton',
    description: 'Base CRUD layer for FYIT collections'
  },

  components: {
    dirs: [
      {
        path: './app/components',
        prefix: 'Crud',
        global: true
      }
    ]
  },

  imports: {
    dirs: ['./app/composables']
  },

  // Make registry available
  nitro: {
    alias: {
      '#crouton/registry': './registry'
    }
  }
})