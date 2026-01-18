// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
  ],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-ai',
    './layers/rakim'
  ],
  hub: {
    // D1 Database - created via: npx wrangler d1 create rakim-db
    db: {
      dialect: 'sqlite',
      driver: 'd1',
      connection: { databaseId: 'a0642ee2-3477-4052-8b86-1801470127cb' }
    },
    kv: true
  },
  runtimeConfig: {
    // Anthropic API key for AI features
    anthropicApiKey: process.env.NUXT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  },
  // Disable passkeys for Cloudflare Workers (tsyringe incompatibility)
  croutonAuth: {
    methods: {
      passkeys: false
    }
  },
  // Cloudflare Workers deployment
  nitro: {
    preset: 'cloudflare-module',
    // Exclude passkey-related packages that use tsyringe (CF Workers incompatible)
    moduleSideEffects: ['reflect-metadata'],
    rollupConfig: {
      external: ['tsyringe', 'reflect-metadata', '@peculiar/x509']
    }
  }
})
