import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup deduplication guard
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-pages')) {
  _dependencies.add('crouton-pages')
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
      },
      // Stubs dir: registers AIPageGenerator without prefix so crouton-ai can override it.
      // priority: -1 matches the pattern used by crouton-i18n stubs — overridden by real packages.
      {
        path: join(currentDir, 'app/stubs'),
        prefix: '',
        global: true,
        priority: -1
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
        redirectDashboard: false,
        // Base URL for absolute SEO URLs (Open Graph, canonical, hreflang)
        // Set via NUXT_PUBLIC_CROUTON_PAGES_SITE_URL env var
        siteUrl: '',
        // Single-team mode: eliminates team slug from public URLs
        // When set, all public URLs omit the team prefix
        // e.g., /nl/about instead of /sintlukas/nl/about
        singleTeam: {
          // Team slug to use (empty = disabled)
          slug: '',
          // Default locale for root redirect (/ → /{slug}/{locale}/)
          defaultLocale: 'en'
        }
      }
    }
  },

  hooks: {
    // In single-team mode, add /:locale/:slug* route so Vue Router can match
    // single-segment URLs like /nl/ (the 3-param /:team/:locale/:slug* route
    // requires 2+ segments and can't match /nl/ alone).
    // For 2+ segment URLs like /nl/aanbod, Vue Router prefers the 3-param route
    // (team=nl, locale=aanbod) — the page's validate+setup handles param remapping.
    'pages:extend'(pages) {
      const teamLocalePage = pages.find(p =>
        p.name === 'team-locale-slug' ||
        (p.path && p.path.includes('team') && p.path.includes('locale') && p.path.includes('slug'))
      )
      if (teamLocalePage?.file) {
        pages.push({
          name: 'single-team-locale-slug',
          path: '/:locale([a-z]{2,3})/:slug(.*)*',
          file: teamLocalePage.file
        })
      }
    }
  },

  experimental: {
    inlineRouteRules: true
  },

  // Route rules for ISR caching (Nuxt 4.3+)
  // NOTE: Wildcards like '/api/teams/*/pages/**' break layer route matching in Nitro 2.13.1
  // Use specific patterns to avoid conflicts with generated layer routes (/api/teams/[id]/pages-pages/**)
  // ISR caching disabled until we have a safe pattern that doesn't conflict with collection APIs
  // routeRules: {
  //   '/api/teams/*/pages/**': { isr: 3600 }  // BROKEN: conflicts with pages-pages layer routes
  // },

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
