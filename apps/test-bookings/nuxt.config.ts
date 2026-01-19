// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Include types directory for collection type augmentation
  typescript: {
    tsConfig: {
      include: ['../types/**/*.d.ts']
    }
  },

  // crouton-core now auto-includes auth, admin, and i18n
  extends: [
    '@fyit/crouton-core',          // Core (includes auth, admin, i18n)
    '@fyit/crouton-ai',            // AI features (translation, chat)
    '@fyit/crouton-editor',        // Rich text editor
    '@fyit/crouton-collab',        // Real-time collaboration (Yjs)
    '@fyit/crouton-pages',         // CMS pages with page types
    '@fyit/crouton-email',         // Optional: Email functionality
    '@fyit/crouton-maps',          // Optional: Maps functionality
    '@fyit/crouton-bookings',      // Bookings app (auto-discovered)
    './layers/bookings',           // Local customizations
    './layers/pages'
  ],
  modules: ['@nuxthub/core', '@nuxt/ui'],
  hub: { db: 'sqlite' },

  // Fix for TipTap "Adding different instances of a keyed plugin" error
  // See: https://ui.nuxt.com/docs/components/editor
  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor'
      ]
    }
  },

  // Enable booking email functionality
  runtimeConfig: {
    croutonBookings: {
      email: { enabled: true }
    },
    public: {
      croutonAI: {
        defaultProvider: 'anthropic',
        defaultModel: 'claude-sonnet-4-20250514'
      },
      croutonBookings: {
        email: { enabled: true }
      },
      croutonPages: {
        // Set to true to redirect /dashboard/[team] → /[team]
        redirectDashboard: false,
        // App domains that are NOT custom domains
        appDomains: ['localhost']
      },
      mapbox: {
        accessToken: process.env.MAPBOX_TOKEN || '',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [4.3517, 50.8503], // Brussels [lng, lat]
        zoom: 12
      }
    }
  }
})