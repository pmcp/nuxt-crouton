// Nuxt Crouton Events Configuration
// https://nuxt.com/docs/api/nuxt-config

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('nuxt-crouton-events')) {
  _dependencies.add('nuxt-crouton-events')
  console.log('🍞 crouton:events ✓ Layer loaded')
}

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
