export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  ssr: false,

  app: {
    baseURL: '/__nuxt_crouton_devtools/',
  },

  compatibilityDate: '2025-01-01'
})
