export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-ai',
    '@fyit/crouton-triage',
    // Local generated layer must come last
    './layers/triage'
  ],

  modules: [
    '@fyit/crouton'
  ],

  croutonAuth: {
    methods: {
      credentials: true
    }
  },

  hub: { db: 'sqlite', kv: true }
})
