export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-collab',
    '@fyit/crouton-atelier'
  ],

  hub: {
    db: 'sqlite'
  },

  compatibilityDate: '2025-01-01'
})
