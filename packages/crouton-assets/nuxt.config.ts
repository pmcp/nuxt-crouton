import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-assets')) {
  _dependencies.add('crouton-assets')
  console.log('🍞 crouton:assets ✓ Layer loaded')
}

export default defineNuxtConfig({
  $meta: {
    description: 'Asset management addon layer for nuxt-crouton with centralized media library',
    name: 'crouton-assets'
  },

  // Note: This is an addon layer - users must explicitly extend both:
  // extends: ['@fyit/crouton-core', '@fyit/crouton-assets']
  // And ensure NuxtHub blob storage is enabled: hub: { blob: true }

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonAssets',
        global: true
      }
    ]
  },

  // Composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  }
})
