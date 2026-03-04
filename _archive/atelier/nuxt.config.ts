export default defineNuxtConfig({
  modules: ['@fyit/crouton'],

  css: ['~/assets/css/main.css'],

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-i18n',
    '@fyit/crouton-collab',
    '@fyit/crouton-atelier'
  ],

  hub: {
    db: 'sqlite'
  },

  compatibilityDate: '2025-01-01'
})
