import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-maps')) {
  _dependencies.add('crouton-maps')
  console.log('🍞 crouton:maps ✓ Layer loaded (MapLibre GL · OpenFreeMap · Nominatim — no API key required)')
}

export default defineNuxtConfig({

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@fyit/crouton-core', '@fyit/crouton-maps']

  $meta: {
    description: 'Map integration layer for Nuxt Crouton with MapLibre GL (@geoql/v-maplibre)',
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

  // @geoql/v-maplibre renders the map client-only (maplibre-gl touches the DOM),
  // so transpile it for the SSR build. NOTE: maplibre-gl is deliberately NOT in
  // `transpile` — it's a CJS-only package (`main: dist/maplibre-gl.js`, no `module`/
  // `exports`), and @geoql/v-maplibre imports NAMED exports from it
  // (`import { Map, AttributionControl } from 'maplibre-gl'`). If maplibre-gl is
  // transpiled inline, Vite resolves those named imports against the raw CJS file and
  // throws at runtime ("does not provide an export named 'Map'"), so the map components
  // (and any collection viewer that loads them) never mount. Pre-bundling it via
  // optimizeDeps instead lets esbuild synthesize the named exports. (#624)
  build: {
    transpile: ['@geoql/v-maplibre']
  },

  vite: {
    // Force Vite to pre-bundle the map deps so esbuild's CJS→ESM interop exposes
    // maplibre-gl's named exports to @geoql/v-maplibre's `import { Map } from 'maplibre-gl'`.
    optimizeDeps: {
      include: ['maplibre-gl', '@geoql/v-maplibre']
    }
  },

  // Runtime config.
  //
  // No access tokens are required: the base map renders with OpenFreeMap tiles
  // and geocoding is proxied to Nominatim (OpenStreetMap) — both keyless.
  //
  // PRIVATE (config.maps.geocodingUrl): the Nominatim base URL used by the
  // server-side /api/maps/geocode proxy. Point it at a self-hosted Nominatim to
  // avoid the public instance's usage policy / rate limits.
  //
  // PUBLIC (config.public.maps): non-sensitive map defaults (style, center, zoom).
  runtimeConfig: {
    // PRIVATE — server only. Cloudflare: set NUXT_MAPS_GEOCODING_URL to override.
    maps: {
      geocodingUrl: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
    },
    public: {
      maps: {
        // Cloudflare: set NUXT_PUBLIC_MAPS_STYLE to override the default style.
        style: process.env.MAPS_STYLE || 'https://tiles.openfreemap.org/styles/liberty',
        center: [4.9041, 52.3676] as [number, number],
        zoom: 12
      }
    }
  }
})
