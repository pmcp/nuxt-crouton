export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-ai',
    '@fyit/crouton-schema-designer'
  ],

  modules: ['@nuxthub/core', '@nuxt/ui'],

  hub: {
    db: 'sqlite'
  },

  css: ['~/assets/css/main.css']
})