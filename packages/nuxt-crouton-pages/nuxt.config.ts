import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

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
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-editor'
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
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: './locales'
  }
})
