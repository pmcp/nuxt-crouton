export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  extends: [
    '@friendlyinternet/nuxt-crouton'
  ],

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css']
})