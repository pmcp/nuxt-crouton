import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-flow')) {
  _dependencies.add('crouton-flow')
  console.log('🍞 crouton:flow ✓ Layer loaded')
}

export default defineNuxtConfig({
  $meta: {
    description: 'Vue Flow integration layer for Nuxt Crouton - graph/DAG visualization',
    name: 'crouton-flow'
  },

  // Extend crouton-collab for shared collaboration infrastructure
  extends: ['@fyit/crouton-collab'],

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@fyit/crouton-core', '@fyit/crouton-flow']

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonFlow',
        global: true
      }
    ]
  },

  // Composables auto-import
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Transpile Vue Flow for SSR compatibility
  build: {
    transpile: ['@vue-flow/core', '@vue-flow/background', '@vue-flow/controls', '@vue-flow/minimap']
  },

  // Nitro server configuration for Yjs sync
  nitro: {
    experimental: {
      websocket: true
    }
  },

  // Vite optimization for Vue Flow
  vite: {
    optimizeDeps: {
      include: ['@vue-flow/core', '@vue-flow/background', '@vue-flow/controls', '@vue-flow/minimap', '@dagrejs/dagre']
    }
  }
})
