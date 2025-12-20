// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Extend crouton layers
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth',
    './layers/blog'
  ],

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxthub/core'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // NuxtHub for SQLite database
  hub: {
    // @ts-ignore - NuxtHub types not fully generated until prepare
    database: true
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        semi: false,
        quotes: 'single',
        indent: 2,
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
