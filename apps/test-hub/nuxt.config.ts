// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  // Extend crouton layers
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth',
    './layers/blog'
  ],

  // https://nuxt.com/modules
  modules: [
    '@nuxthub/core',
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  // https://devtools.nuxt.com
  devtools: { enabled: true },

  // https://nuxt.com/docs/getting-started/upgrade#testing-nuxt-4
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-03-01',

  // https://hub.nuxt.com/docs/getting-started/installation#options
  hub: {
    database: true
  },

  // Development config
  eslint: {
    config: {
      stylistic: {
        quotes: 'single',
        commaDangle: 'never'
      }
    }
  }
})
