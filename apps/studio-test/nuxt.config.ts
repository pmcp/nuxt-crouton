export default defineNuxtConfig({
  compatibilityDate: '2025-01-20',
  devtools: { enabled: true },

  extends: [
    '@fyit/crouton-studio',
    './layers/demo'
  ],

  modules: ['@nuxthub/core', '@nuxt/ui'],

  hub: {
    db: 'sqlite'
  }
})
