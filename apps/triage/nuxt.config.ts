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

  // Runtime config for crouton-triage handlers.
  // The handlers read from INCONSISTENT paths (pre-existing):
  //   - OAuth install/callback: flat `slackClientId`, `slackClientSecret`
  //   - Slack webhook: nested `croutonTriage.slack.signingSecret`
  //   - Resend webhook: flat `resendApiToken`, `resendWebhookSigningSecret`
  // We define ALL paths so both dev (process.env) and prod (NUXT_* secrets) work.
  runtimeConfig: {
    // Flat keys — read by OAuth install.get.ts + callback.get.ts
    slackClientId: process.env.SLACK_CLIENT_ID || '',
    slackClientSecret: process.env.SLACK_CLIENT_SECRET || '',
    // Nested keys — read by Slack webhook handler
    croutonTriage: {
      slack: {
        clientId: process.env.SLACK_CLIENT_ID || '',
        clientSecret: process.env.SLACK_CLIENT_SECRET || '',
        signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      },
    },
    // Flat keys — read by Resend webhook handler
    resendApiToken: process.env.RESEND_API_TOKEN || '',
    resendWebhookSigningSecret: process.env.RESEND_WEBHOOK_SIGNING_SECRET || '',
    // Public config — read by OAuth handlers for redirect URIs
    public: {
      baseUrl: process.env.BASE_URL || '',
    },
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
