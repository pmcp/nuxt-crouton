export default defineNuxtConfig({
  compatibilityDate: '2025-09-30',

  modules: [
    '@nuxtjs/color-mode',
    '@nuxt/ui'
  ],

  css: ['~/assets/css/main.css'],

  colorMode: {
    classSuffix: ''
  },

  devtools: {
    enabled: true
  },

  future: {
    compatibilityVersion: 4
  }
})
