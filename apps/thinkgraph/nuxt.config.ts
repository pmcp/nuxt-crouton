export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },
  devServer: { port: 3004 },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-flow',
    '@fyit/crouton-ai',
    // Generated layer must come last
    './layers/thinkgraph'
  ],

  modules: [
    '@fyit/crouton'
  ],

  croutonAuth: {
    methods: {
      password: true,
      passkeys: false
    }
  },

  runtimeConfig: {
    falApiKey: '',  // NUXT_FAL_API_KEY
  },

  hub: {
    db: 'sqlite',
    kv: true
  },

  ogImage: { enabled: false }
})