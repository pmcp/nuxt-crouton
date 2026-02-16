export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-designer',
    './layers/designer'
  ],

  modules: ['@nuxthub/core', '@nuxt/ui', '@nuxt/eslint'],

  hub: {
    db: 'sqlite'
  },

  // Auto-create a personal workspace so team-scoped APIs work immediately
  croutonAuth: {
    teams: {
      autoCreateOnSignup: true,
      showSwitcher: false,
      showManagement: false
    }
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
