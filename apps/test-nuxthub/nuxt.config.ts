// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Extend crouton layers
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth',
    './layers/blog'
  ],

  modules: [
    '@nuxthub/core',
    '@nuxt/ui'
  ],

  // NuxtHub configuration (v0.10+ multi-vendor)
  hub: {
    db: 'sqlite' // Uses local SQLite in dev, no wrangler needed
  },

  // Auth configuration - enable debug mode to trace login issues
  runtimeConfig: {
    public: {
      crouton: {
        auth: {
          mode: 'personal',
          debug: true, // Enable verbose logging
          methods: {
            password: true
          },
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
