import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-maps',
    description: 'Map integration layer for Nuxt Crouton with Mapbox support'
  },

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-maps']

  // Enable Nuxt-Mapbox module
  modules: ['nuxt-mapbox'],

  // Mapbox configuration - nuxt-mapbox expects accessToken here
  // It will be overridden by the parent app's runtime config
  mapbox: {
    accessToken: process.env.MAPBOX_TOKEN || '',
  },

  // Runtime config for secure token management
  // This allows parent apps to override with their own tokens
  runtimeConfig: {
    public: {
      mapbox: {
        accessToken: process.env.MAPBOX_TOKEN || '',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-122.4194, 37.7749] as [number, number],
        zoom: 12
      }
    }
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
  }
})
