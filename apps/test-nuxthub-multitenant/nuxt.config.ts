// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth',
    '@friendlyinternet/nuxt-crouton-i18n',
    '@friendlyinternet/nuxt-crouton-themes/themes',
    '@friendlyinternet/nuxt-crouton-themes/ko',
    '@friendlyinternet/nuxt-crouton-themes/minimal',
    '@friendlyinternet/nuxt-crouton-themes/kr11',
    './layers/project-management',
    './layers/knowledge-base'
  ],
  modules: ['@nuxthub/core', '@nuxt/ui'],
  hub: { db: 'sqlite' },

  // Multi-tenant configuration
  croutonAuth: {
    mode: 'multi-tenant',
    debug: true,
    teams: {
      allowCreate: true,
      limit: 10
    }
  }
})
