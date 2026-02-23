import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-i18n',
    '@fyit/crouton-editor',
    '@fyit/crouton-flow',
    '@fyit/crouton-assets',
    '@fyit/crouton-charts',
    '@fyit/crouton-maps',
    '@fyit/crouton-ai',
    '@fyit/crouton-collab',
    '@fyit/crouton-pages',
    '@fyit/crouton-bookings',
    './layers/shop',
    './layers/content',
    './layers/people',
    './layers/projects',
    './layers/bookings',
    './layers/pages'
  ],
  hub: {
    db: 'sqlite',
    kv: true,
    // cloudflare-pages preset causes NuxtHub to select the cloudflare-r2 blob driver,
    // which requires a wrangler R2 binding even in `nuxt dev`. Force the local fs
    // driver during development; production builds get cloudflare-r2 automatically.
    blob: process.env.NODE_ENV === 'production' ? true : { driver: 'fs', dir: '.data/blob' }
  },

  // Disable OG Image to reduce bundle size for Cloudflare (saves ~4MB)
  ogImage: { enabled: false },

  // Disable passkeys for Cloudflare Workers (tsyringe incompatibility)
  croutonAuth: {
    methods: {
      passkeys: false
    }
  },

  // Cloudflare Pages deployment
  nitro: {
    preset: 'cloudflare-pages',
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