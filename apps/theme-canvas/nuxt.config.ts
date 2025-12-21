export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  extends: [
    '@friendlyinternet/nuxt-crouton-themes/themes',
    '@friendlyinternet/nuxt-crouton-themes/ko',
    '@friendlyinternet/nuxt-crouton-themes/minimal',
    '@friendlyinternet/nuxt-crouton-themes/kr11'
  ],

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css']
})
