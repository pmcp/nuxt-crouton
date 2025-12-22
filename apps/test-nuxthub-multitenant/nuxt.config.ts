export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth',
    './layers/project-management',
    './layers/knowledge-base'
  ],

  modules: ['@nuxthub/core', '@nuxt/ui'],

  hub: { db: 'sqlite' },

  croutonAuth: {
    mode: 'multi-tenant',
    debug: true,
    teams: {
      allowCreate: true,
      limit: 10
    }
  }
})