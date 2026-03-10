import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-maps')) {
  _dependencies.add('crouton-maps')
  console.log('🍞 crouton:maps ✓ Layer loaded')
  if (!process.env.MAPBOX_TOKEN && !process.env.MAPBOX_PUBLIC_TOKEN) {
    console.warn('🍞 crouton:maps ⚠ No MAPBOX_TOKEN or MAPBOX_PUBLIC_TOKEN set in .env — maps will show a placeholder')
  }
}

export default defineNuxtConfig({

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@fyit/crouton-core', '@fyit/crouton-maps']

  // Enable Nuxt-Mapbox module
  modules: ['nuxt-mapbox'],
  $meta: {
    description: 'Map integration layer for Nuxt Crouton with Mapbox support',
    name: 'crouton-maps'
  },

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonMaps',
        global: true
      }
    ]
  },

  // Composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Server routes (geocoding proxy)
  nitro: {
    scanDirs: [join(currentDir, 'server')]
  },

  // Runtime config — token placement:
  //
  // PRIVATE (config.mapbox.accessToken): used by the server-side geocoding proxy
  // at /api/maps/geocode. Never sent to the client.
  //
  // PUBLIC (config.public.mapbox): only non-sensitive defaults (style, center, zoom)
  // plus a boolean `isConfigured` flag so components can degrade gracefully.
  //
  // NOTE: Mapbox GL JS itself (the tile-renderer) requires a token client-side to
  // authenticate tile requests directly to Mapbox CDN — this is an inherent
  // constraint of the Mapbox architecture. Use a restricted browser key scoped to
  // your domain in the Mapbox account dashboard to limit exposure.
  // The browser key goes in config.public.mapbox.accessToken.
  // The full/unrestricted key should ONLY be in config.mapbox.accessToken (private).
  runtimeConfig: {
    // PRIVATE — server only.
    // Local dev: set MAPBOX_TOKEN in .env (read at build time via process.env below)
    // Cloudflare: set NUXT_MAPBOX_ACCESS_TOKEN (auto-mapped at runtime by Nuxt)
    mapbox: {
      accessToken: process.env.MAPBOX_TOKEN || ''
    },
    public: {
      mapbox: {
        // Local dev: set MAPBOX_PUBLIC_TOKEN in .env (falls back to MAPBOX_TOKEN)
        // Cloudflare: set NUXT_PUBLIC_MAPBOX_ACCESS_TOKEN (auto-mapped at runtime by Nuxt)
        // In production: use a domain-restricted browser key from Mapbox dashboard
        accessToken: process.env.MAPBOX_PUBLIC_TOKEN || process.env.MAPBOX_TOKEN || '',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-122.4194, 37.7749] as [number, number],
        zoom: 12
      }
    }
  },

  // Mapbox module configuration — uses the public browser token for tile loading
  mapbox: {
    accessToken: process.env.MAPBOX_PUBLIC_TOKEN || process.env.MAPBOX_TOKEN || ''
  }
})
