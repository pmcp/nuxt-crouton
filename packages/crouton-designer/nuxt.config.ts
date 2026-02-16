import { join } from 'node:path'

const currentDir = import.meta.dirname

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-designer')) {
  _dependencies.add('crouton-designer')
  console.log('🍞 crouton:designer ✓ Layer loaded')
}

export default defineNuxtConfig({
  extends: ['@fyit/crouton-ai'],

  $meta: {
    name: '@crouton/designer',
    version: '0.1.0'
  },

  modules: ['@vueuse/nuxt'],

  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Designer',
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
