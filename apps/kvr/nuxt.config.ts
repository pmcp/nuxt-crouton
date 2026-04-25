export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  modules: ['@fyit/crouton'],
  compatibilityDate: '2025-07-15',
  devServer: { port: 3011 },
  devtools: { enabled: true },
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-i18n',
    '@fyit/crouton-email',
    './layers/kvr'
  ],
  hub: {
    blob: true,
    db: 'sqlite'
  },

  ogImage: { enabled: false },

  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: 'kvr-color-mode',
    dataValue: 'light'
  },

  runtimeConfig: {
    email: {
      resendApiKey: '',
      fromAddress: 'no-reply@kvr.local'
    },
    kvr: {
      publicToken: '',
      publicRecipient: '',
      publicTeamSlug: 'kvr'
    }
  },

  croutonAuth: {
    methods: {
      passkeys: false
    },
    teams: {
      defaultTeamSlug: 'kvr',
      allowCreate: false,
      showSwitcher: false,
      showManagement: false
    }
  },

  routeRules: {
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/auth/**': { headers: { 'cache-control': 'no-store' } },
    '/admin/**': { headers: { 'cache-control': 'no-store' } },
    '/kvr/submit': { headers: { 'cache-control': 'no-store' } },
    '/api/public/**': { headers: { 'cache-control': 'no-store' } }
  }
})
