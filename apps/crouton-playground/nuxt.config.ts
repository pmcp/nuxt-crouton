export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  // Layers - based on crouton.config.js features
  // IMPORTANT: @fyit/crouton-core BUNDLES auth, admin, and i18n automatically.
  // DO NOT add them separately - it causes duplicate layer loading and SSR errors.
  extends: [// Core (includes auth, admin, i18n)
  // Asset management (picker, uploader)
  '@fyit/crouton-core', // Rich text editing
  '@fyit/crouton-assets', // AI features
  '@fyit/crouton-editor', // Chart visualizations
  '@fyit/crouton-ai', // Collaboration (Yjs-based real-time editing)
  '@fyit/crouton-charts', // Graph/DAG visualization
  '@fyit/crouton-collab', // Maps
  '@fyit/crouton-flow', // Pages management
  '@fyit/crouton-maps', // Bookings management
  '@fyit/crouton-pages', // Local layers must come last to override framework defaults
  '@fyit/crouton-bookings', './layers/shop', './layers/content', './layers/people', './layers/projects', './layers/bookings', './layers/pages'],

  modules: [
    '@fyit/crouton'
  ],

  hub: { db: 'sqlite' },

  croutonAuth: {
    methods: {
      credentials: true
    }
  }
})