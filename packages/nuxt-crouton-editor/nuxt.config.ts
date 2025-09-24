export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-editor',
    description: 'Rich text editor layer for FYIT collections'
  },

  // Extend the base crouton layer
  extends: [
    '@fyit/nuxt-crouton'
  ],

  // Component configuration
  components: {
    dirs: [
      {
        path: './app/components',
        prefix: 'Editor',
        global: true
      }
    ]
  }
})