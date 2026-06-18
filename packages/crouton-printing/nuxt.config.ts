import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-printing')) {
  _dependencies.add('crouton-printing')
  console.log('🍞 crouton:printing ✓ Layer loaded')
}

export default defineNuxtConfig({
  // Usage (addon layer — extend it from the consuming app or domain layer):
  // extends: ['@fyit/crouton-core', '@fyit/crouton-printing', '@fyit/crouton-sales']

  $meta: {
    description: 'Domain-agnostic printing layer for Nuxt Crouton - print-job queue, ESC/POS engine, drivers, transport',
    name: 'crouton-printing'
  },

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonPrinting',
        global: true
      }
    ]
  },

  // Composables auto-import
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Server utilities auto-import — makes enqueuePrintJob() and the engine
  // available across the merged nitro context of any app that extends this layer.
  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    }
  }
})
