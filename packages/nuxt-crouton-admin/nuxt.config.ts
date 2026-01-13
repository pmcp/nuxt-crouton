export default defineNuxtConfig({
  // Note: crouton-auth should be extended by the consumer before crouton-admin
  // This ensures auth composables and server utils are available

  // Layer metadata
  $meta: {
    name: '@crouton/admin',
    version: '0.1.0'
  },

  // Components from the layer
  components: [
    { path: 'app/components', pathPrefix: false }
  ],

  // Auto-imports from the layer
  imports: {
    dirs: ['app/composables']
  },

  // Runtime config defaults
  runtimeConfig: {
    // Public config
    public: {
      crouton: {
        admin: {
          // Super admin page route prefix (default: /super-admin)
          // Note: Super admin routes are at /super-admin/*
          // Team admin routes are at /admin/[team]/*
          routePrefix: '/super-admin',
          // Enable impersonation feature
          impersonation: true,
          // Dashboard stats refresh interval (ms)
          statsRefreshInterval: 30000
        }
      }
    }
  },

  // Compatibility
  compatibilityDate: '2024-11-01',

  // Nitro server config
  nitro: {
    imports: {
      dirs: ['server/utils']
    }
  }
})
