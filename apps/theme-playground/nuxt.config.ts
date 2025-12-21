// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  extends: [
    '@friendlyinternet/nuxt-crouton-themes/themes',  // Theme switcher
    '@friendlyinternet/nuxt-crouton-themes/ko',      // KO theme
    '@friendlyinternet/nuxt-crouton-themes/minimal', // Minimal theme
    '@friendlyinternet/nuxt-crouton-themes/kr11'     // KR-11 theme
  ],

  modules: ['@nuxt/ui']
})