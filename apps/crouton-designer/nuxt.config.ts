export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-ai',
    '@fyit/crouton-designer',
    './layers/designer'
  ],

  modules: ['@nuxthub/core', '@nuxt/ui', '@nuxt/eslint'],

  hub: {
    db: 'sqlite'
  },

  css: ['~/assets/css/main.css'],

  eslint: {
    config: {
      stylistic: {
        semi: false,
        quotes: 'single'
      }
    }
  }
})
