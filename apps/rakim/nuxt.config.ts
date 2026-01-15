// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-ai',
    './layers/rakim'
  ],
  hub: { db: 'sqlite' },
  runtimeConfig: {
    // Anthropic API key for AI features
    anthropicApiKey: process.env.NUXT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  }
})
