export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-flow',
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

  hub: {
    db: 'sqlite',
    kv: true
  },

  ogImage: { enabled: false }
})