export default defineNuxtConfig({
  compatibilityDate: '2025-09-30',

  modules: [
    '@nuxt/ui',
    '@friendlyinternet/nuxt-crouton'
  ],

  devtools: {
    enabled: true
  },

  future: {
    compatibilityVersion: 4
  }
})
