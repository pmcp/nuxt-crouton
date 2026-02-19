export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  // Layers - based on crouton.config.js features
  // IMPORTANT: @fyit/crouton-core BUNDLES auth, admin, and i18n automatically.
  // DO NOT add them separately - it causes duplicate layer loading and SSR errors.
  extends: [
    '@fyit/crouton-core',        // Core (includes auth, admin, i18n)
    '@fyit/crouton-themes/themes',
    '@fyit/crouton-assets',      // Asset management (picker, uploader)
    '@fyit/crouton-ai',
    '@fyit/crouton-editor',
    '@fyit/crouton-charts',      // Chart visualizations
    '@fyit/crouton-collab',      // Collaboration (Yjs-based real-time editing)
    '@fyit/crouton-flow',        // Graph/DAG visualization
    '@fyit/crouton-maps',        // Maps (used by bookings PanelMap)
    '@fyit/crouton-pages',
    '@fyit/crouton-bookings',
    '@fyit/crouton-mcp-toolkit',  // MCP: expose collections to AI assistants
    // Local layers must come last to override framework defaults
    './layers/bookings',
    './layers/pages'
  ],

  modules: [
    '@fyit/crouton'
  ],

  // Auth configuration
  croutonAuth: {
    methods: {
      credentials: true
    }
  },

})
