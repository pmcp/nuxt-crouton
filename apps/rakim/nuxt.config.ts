// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-ai'
  ],
  runtimeConfig: {
    // Anthropic API key for AI features
    anthropicApiKey: process.env.NUXT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  }
})
