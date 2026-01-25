import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-pages')) {
  _dependencies.add('crouton-pages')
  console.log('🍞 crouton:pages ✓ Layer loaded')
}

/**
 * Nuxt Crouton Pages Layer
 *
 * CMS-like page management system with:
 * - Page types from app packages (Bookings, Sales, etc.)
 * - Tree/sortable layout for page ordering
 * - Public page rendering at /[team]/[slug]
 * - Admin page management at /admin/[team]/pages
 * - Custom domain support with automatic team resolution
 */
export default defineNuxtConfig({
  // Extend core crouton and editor
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-editor'
  ],

  // Components auto-import with CroutonPages prefix
  // Form.vue → CroutonPagesForm
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonPages',
        global: true
      }
    ]
  },

  // Auto-import composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Runtime config schema
  runtimeConfig: {
    public: {
      croutonPages: {
        // App domains that should NOT be treated as custom domains
        // e.g., ['myapp.com', 'staging.myapp.com']
        appDomains: [],
        // Enable debug logging
        debug: false,
        // Redirect old /dashboard/[team] URLs to /[team] (pages-based)
        // Enable this when migrating from dashboard to pages
        redirectDashboard: false
      }
    }
  },

  // Route rules for ISR caching (Nuxt 4.3+)
  // Published pages benefit from Incremental Static Regeneration
  routeRules: {
    // Public page content - cache for 1 hour with ISR
    '/api/teams/*/pages/**': { isr: 3600 },
    // Published pages navigation - cache for 1 hour
    '/api/teams/*/pages': { isr: 3600 }
  },

  // Nitro server configuration
  nitro: {
    // Include server middleware and utils
    scanDirs: ['./server'],
    // Mark app-specific aliases as external (they're defined by consuming apps)
    externals: {
      inline: ['#crouton/schema/pages']
    },
    rollupConfig: {
      external: ['#crouton/schema/pages']
    }
  },

  // Vite configuration for build-time
  vite: {
    build: {
      rollupOptions: {
        // Mark as external - these aliases are provided by consuming apps
        external: ['#crouton/schema/pages']
      }
    }
  },

  // i18n translations
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: './locales'
  }
})
