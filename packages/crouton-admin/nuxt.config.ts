import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-admin')) {
  _dependencies.add('crouton-admin')
  console.log('🍞 crouton:admin ✓ Layer loaded')
}

export default defineNuxtConfig({
  // Note: crouton-auth should be extended by the consumer before crouton-admin
  // This ensures auth composables and server utils are available

  // Layer metadata
  $meta: {
    name: '@crouton/admin',
    version: '0.1.0'
  },

  // i18n configuration for admin translations
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'nl', file: 'nl.json' },
      { code: 'fr', file: 'fr.json' }
    ],
    langDir: '../i18n/locales'
  },

  // Components from the layer
  components: [
    { path: join(currentDir, 'app/components'), pathPrefix: false }
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

  // Plugins
  plugins: [
    { src: join(currentDir, 'app/plugins/team-theme.client.ts'), mode: 'client' }
  ],

  // Nitro server config
  nitro: {
    imports: {
      dirs: ['server/utils']
    }
  }
})
