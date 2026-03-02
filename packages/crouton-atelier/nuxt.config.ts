import { join } from 'node:path'

const currentDir = import.meta.dirname

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-atelier')) {
  _dependencies.add('crouton-atelier')
  console.log('🍞 crouton:atelier ✓ Layer loaded')
}

export default defineNuxtConfig({
  extends: ['@fyit/crouton-collab'],

  $meta: {
    name: '@crouton/atelier',
    version: '0.1.0'
  },

  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Atelier',
        global: true
      }
    ]
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  compatibilityDate: '2025-01-01',

  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    }
  }
})
