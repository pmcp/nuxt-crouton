import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-analytics')) {
  _dependencies.add('crouton-analytics')
  console.log('🍞 crouton:analytics ✓ Layer loaded')
}

export default defineNuxtConfig({
  $meta: {
    description: 'Provider-agnostic usage analytics for Nuxt Crouton — PostHog default, swappable backend',
    name: 'crouton-analytics'
  },

  // Extends crouton-core for team context + app auto-discovery
  extends: ['@fyit/crouton-core'],

  // @nuxt/scripts backs the PostHog provider (SSR-safe, consent-aware, first-party proxy)
  modules: ['@nuxt/scripts'],

  // Composables auto-import (useCroutonAnalytics)
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Default config — `noop` so a layer-only install is inert until an app opts in to a provider.
  // Apps/POCs set provider + key via NUXT_PUBLIC_CROUTON_ANALYTICS_* env or their own runtimeConfig.
  // Top-level key (not crouton.analytics) — see types/nuxt.d.ts for why.
  runtimeConfig: {
    public: {
      croutonAnalytics: {
        provider: 'noop', // 'noop' | 'console' | 'posthog'
        posthog: {
          key: '',
          host: 'https://us.i.posthog.com'
        }
      }
    }
  }
})
