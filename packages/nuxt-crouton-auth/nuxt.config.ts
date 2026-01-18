import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('nuxt-crouton-auth')) {
  _dependencies.add('nuxt-crouton-auth')
  console.log('🍞 crouton:auth ✓ Layer loaded')
}

export default defineNuxtConfig({
  // Register the auth module
  modules: [
    join(currentDir, 'module.ts')
  ],

  // Layer metadata
  $meta: {
    name: '@crouton/auth',
    version: '0.1.0'
  },

  // i18n configuration for auth translations
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' }
    ],
    langDir: '../i18n/locales'
  },

  // Runtime config defaults
  runtimeConfig: {
    // Server-only config
    auth: {
      secret: '', // BETTER_AUTH_SECRET
      baseUrl: '' // BETTER_AUTH_URL
    },

    // Public config
    public: {
      crouton: {
        auth: {
          methods: {
            password: true,
            oauth: undefined,
            passkeys: false,
            twoFactor: false,
            magicLink: false
          },
          teams: {
            autoCreateOnSignup: false,
            defaultTeamSlug: undefined,
            allowCreate: true,
            limit: 0, // 0 = unlimited
            memberLimit: 100,
            showSwitcher: true,
            showManagement: true
          },
          ui: {
            theme: 'default' as const,
            redirects: {
              afterLogin: '/dashboard',
              afterLogout: '/',
              afterRegister: '/dashboard'
            }
          }
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
    },
    // Override #crouton/team-auth to use Better Auth instead of direct DB queries
    alias: {
      '#crouton/team-auth': join(currentDir, 'server/utils/team-auth')
    }
  }
})
