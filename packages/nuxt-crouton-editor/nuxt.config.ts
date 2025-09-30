export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-editor',
    description: 'Rich text editor addon layer for FYIT collections'
  },

  // Note: This is an addon layer - users must explicitly extend both:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-editor']

  // Tiptap module configuration
  modules: ['nuxt-tiptap'],

  tiptap: {
    prefix: 'Tiptap'
  },

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