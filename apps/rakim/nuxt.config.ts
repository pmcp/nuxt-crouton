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
    // D1 + KV bindings configured in wrangler.toml
    db: 'sqlite',
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
  // Cloudflare Pages deployment
  nitro: {
    preset: 'cloudflare-pages',
    // Exclude passkey-related packages that use tsyringe (CF Workers incompatible)
    moduleSideEffects: ['reflect-metadata'],
    rollupConfig: {
      external: ['tsyringe', 'reflect-metadata', '@peculiar/x509']
    }
  }
})
