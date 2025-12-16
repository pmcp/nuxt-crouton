export default defineNuxtConfig({
  // Layer metadata
  $meta: {
    name: '@crouton/auth',
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
    // Server-only config
    auth: {
      secret: '', // BETTER_AUTH_SECRET
      baseUrl: '', // BETTER_AUTH_URL
    },

    // Public config
    public: {
      crouton: {
        auth: {
          mode: 'personal' as const,
          methods: {
            password: true,
            oauth: undefined,
            passkeys: false,
            twoFactor: false,
            magicLink: false,
          },
          teams: {
            allowCreate: true,
            limit: 5,
            memberLimit: 100,
          },
          billing: {
            enabled: false,
          },
          ui: {
            theme: 'default' as const,
            redirects: {
              afterLogin: '/dashboard',
              afterLogout: '/',
              afterRegister: '/dashboard',
            },
          },
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
