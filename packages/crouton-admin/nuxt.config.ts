import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  // Extend crouton-auth to get auth composables and server utils
  extends: ['../crouton-auth'],

  // Layer metadata
  $meta: {
    name: '@crouton/admin',
    version: '0.1.0',
  },

  // Auto-imports from the layer
  imports: {
    dirs: ['app/composables'],
  },

  // Components from the layer
  components: [
    { path: 'app/components', pathPrefix: false },
  ],

  // Runtime config defaults
  runtimeConfig: {
    // Public config
    public: {
      crouton: {
        admin: {
          // Admin page route prefix (default: /admin)
          routePrefix: '/admin',
          // Enable impersonation feature
          impersonation: true,
          // Dashboard stats refresh interval (ms)
          statsRefreshInterval: 30000,
        },
      },
    },
  },

  // Nitro server config
  nitro: {
    imports: {
      dirs: ['server/utils'],
    },
  },

  // Compatibility
  compatibilityDate: '2024-11-01',
})
