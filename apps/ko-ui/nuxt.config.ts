// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Use the KO theme from the themes package
  extends: ['@friendlyinternet/nuxt-crouton-themes/ko'],

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  // Future flags for Nuxt 4
  future: {
    compatibilityVersion: 4
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