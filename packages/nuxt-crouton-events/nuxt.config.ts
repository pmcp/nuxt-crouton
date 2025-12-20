// Nuxt Crouton Events Configuration
// https://nuxt.com/docs/api/nuxt-config

export default defineNuxtConfig({

  // Runtime config for event tracking
  runtimeConfig: {
    public: {
      croutonEvents: {
        enabled: true,
        snapshotUserName: true,
        errorHandling: {
          mode: 'toast', // 'silent' | 'toast' | 'throw'
          logToConsole: true
        },
        retention: {
          enabled: true,
          days: 90,
          maxEvents: 100000
        }
      }
    }
  },
  compatibilityDate: '2024-10-16'
})
