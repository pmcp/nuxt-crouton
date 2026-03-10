import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-ai',
    '@fyit/crouton-editor',
    '@fyit/crouton-pages',
    '@fyit/crouton-triage',
    '@fyit/crouton-charts',
    // Local layers
    './layers/categorize',
    // Generated layers must come last
    './layers/triage',
    './layers/pages'
  ],

  modules: [
    '@fyit/crouton'
  ],

  croutonAuth: {
    methods: {
      password: true,
      passkeys: false
    }
  },

  hub: {
    db: 'sqlite',
    kv: true
  },

  // Disable OG Image to reduce bundle size for Cloudflare
  ogImage: { enabled: false },

  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com']
    }
  },

  // Cloudflare Pages deployment
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
