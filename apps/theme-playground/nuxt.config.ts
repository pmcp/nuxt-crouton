export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-themes/themes',
    '@fyit/crouton-themes/ko',
    '@fyit/crouton-themes/minimal',
    '@fyit/crouton-themes/kr11'
  ],

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css']
})
