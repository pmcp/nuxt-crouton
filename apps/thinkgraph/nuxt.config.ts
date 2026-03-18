import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-19',
  devtools: { enabled: true },
  devServer: { port: 3004 },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-flow',
    '@fyit/crouton-ai',
    '@fyit/crouton-mcp-toolkit',
    '@fyit/crouton-email',
    // Generated layer must come last
    './layers/thinkgraph'
  ],

  modules: [
    '@fyit/crouton'
  ],

  crouton: {
    mcpToolkit: true,
  },

  croutonAuth: {
    methods: {
      password: true,
      passkeys: false
    }
  },

  runtimeConfig: {
    falApiKey: '',      // NUXT_FAL_API_KEY
    geminiApiKey: '',   // NUXT_GEMINI_API_KEY
    email: {
      from: 'hi@messages.friendlyinter.net',
      fromName: 'ThinkGraph',
    },
    // collabWorkerUrl is provided by crouton-collab layer
    // Override via NUXT_PUBLIC_COLLAB_WORKER_URL env var in production
  },

  hub: {
    db: 'sqlite',
    kv: true
  },

  ogImage: { enabled: false },

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