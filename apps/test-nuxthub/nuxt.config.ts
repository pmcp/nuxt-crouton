// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth',
    './layers/blog'
  ],

  modules: [
    '@nuxthub/core',
    '@nuxt/ui'
  ],

  hub: {
    database: true
  },

  runtimeConfig: {
    public: {
      crouton: {
        auth: {
          mode: 'personal',
          ui: {
            redirects: {
              afterLogin: '/home',
              afterRegister: '/home',
              afterLogout: '/auth/login'
            }
          }
        }
      }
    }
  }
})