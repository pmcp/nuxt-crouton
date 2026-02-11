export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-ai',
    '@fyit/crouton-editor',
    '@fyit/crouton-pages',
    '@fyit/crouton-triage',
    // Local generated layers must come last
    './layers/triage',
    './layers/pages'
  ],

  modules: [
    '@fyit/crouton'
  ],

  croutonAuth: {
    methods: {
      credentials: true
    }
  },

  hub: { db: 'sqlite', kv: true },

  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com']
    }
  }
})
