export default defineNuxtConfig({
  // nuxt-crouton auto-includes i18n - no need to extend or alias separately
  extends: [
    '/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton',
    '/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-auth',
    '/Users/pmcp/Projects/nuxt-crouton/packages/crouton-bookings',
    './layers/bookings'
  ],

  modules: [
    '@nuxt/ui',
    '@nuxthub/core'
  ],

  // Monorepo: alias package imports to local paths
  // Required because generated code imports from @friendlyinternet/* packages
  // and pnpm symlinks point to .ts files that Rollup can't parse
  alias: {
    '@friendlyinternet/nuxt-crouton-auth': '/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-auth'
  },

  hub: {
    db: 'sqlite'
  },

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  compatibilityDate: '2025-01-01'
})
