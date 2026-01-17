import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Real-time collaboration layer for Nuxt Crouton using Yjs CRDTs',
    name: 'nuxt-crouton-collab'
  },

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-collab']

  // Type exports
  alias: {
    '#collab-types': join(currentDir, 'app/types/collab.ts')
  },

  // Composables auto-import
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Components auto-import
  components: {
    dirs: [join(currentDir, 'app/components')]
  },

  // Nitro server configuration for WebSocket sync
  nitro: {
    experimental: {
      websocket: true
    }
  },

  // Vite optimization for Yjs
  vite: {
    optimizeDeps: {
      include: ['yjs', 'y-protocols']
    }
  }
})
