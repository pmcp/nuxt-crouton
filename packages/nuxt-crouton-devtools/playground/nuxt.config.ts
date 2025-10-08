export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/devtools',
    '@friendlyinternet/nuxt-crouton-devtools'
  ],

  devtools: {
    enabled: true
  },

  compatibilityDate: '2025-01-01'
})
