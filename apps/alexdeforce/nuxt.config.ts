import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-i18n',
    '@fyit/crouton-assets',
    '@fyit/crouton-pages',
    './layers/content',
    './layers/pages',
    './layers/crouton',
    './layers/site',
    '@fyit/crouton-editor'
  ],
  hub: {
    blob: true,
    db: 'sqlite'
  },

  ogImage: { enabled: false },

  croutonAuth: {
    methods: {
      passkeys: false
    },
    teams: {
      defaultTeamSlug: 'alexdeforce',
      allowCreate: false,
      showSwitcher: false,
      showManagement: false
    }
  },

  routeRules: {
    // Static assets — immutable cache
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },

    // NOTE: Do NOT add '/api/teams/*/...' SWR rules here — the wildcard
    // conflicts with radix3's :id parameter routing and breaks ALL
    // /api/teams/:id/* generated collection routes.

    // Auth — no caching
    '/auth/**': { headers: { 'cache-control': 'no-store' } },

    // Admin — no caching
    '/admin/**': { headers: { 'cache-control': 'no-store' } },

    // Legacy redirects
    '/led002': { redirect: '/archive/poezie/tussenbruggen' },
    '/led001': { redirect: '/archive/poezie/hoek_van_de_laatste_zon' },
    '/tussenbruggen': { redirect: '/archive/poezie/tussenbruggen' },
    '/spiritjuweel1': { redirect: '/archive/poezie/spiritjuweel-i-kwart-voor-straks' },
    '/archief': { redirect: '/archive' }
  },

  nitro: {
    alias: {
      '@better-auth/passkey/client': resolve(cfStubs, 'client'),
      '@better-auth/passkey': cfStubs,
      'tsyringe': cfStubs,
      'reflect-metadata': cfStubs,
      '@peculiar/x509': cfStubs,
      '@simplewebauthn/server': cfStubs,
      'papaparse': cfStubs
    }
  }
})