import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },
  devServer: { port: 3005 },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-ai',
    '@fyit/crouton-editor',
    '@fyit/crouton-pages',
    '@fyit/crouton-triage',
    '@fyit/crouton-charts',
    '@fyit/crouton-flow',
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

  // Map plain env var names to crouton-triage runtime config so you don't
  // need the NUXT_CROUTON_TRIAGE_* prefix for dev work.
  // Note: Slack uses nested `croutonTriage.slack.*` but Resend uses flat
  // top-level `resend*` keys — that's what the respective handlers read.
  runtimeConfig: {
    croutonTriage: {
      slack: {
        clientId: process.env.SLACK_CLIENT_ID || '',
        clientSecret: process.env.SLACK_CLIENT_SECRET || '',
        signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      },
    },
    resendApiToken: process.env.RESEND_API_TOKEN || '',
    resendWebhookSigningSecret: process.env.RESEND_WEBHOOK_SIGNING_SECRET || '',
  },

  hub: {
    db: 'sqlite',
    kv: true
  },

  // Disable OG Image to reduce bundle size for Cloudflare
  ogImage: { enabled: false },

  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com', 'triage-dev.pmcp.dev'],
      hmr: {
        protocol: 'wss',
        clientPort: 443,
        host: 'triage-dev.pmcp.dev'
      }
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
