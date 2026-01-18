import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('nuxt-crouton-editor')) {
  _dependencies.add('nuxt-crouton-editor')
  console.log('[nuxt-crouton-editor] ✓ Editor layer loaded')
}

export default defineNuxtConfig({
  $meta: {
    description: 'Rich text editor addon layer for Crouton collections (wraps Nuxt UI Editor)',
    name: 'nuxt-crouton-editor'
  },

  // Component configuration - provides CroutonEditorSimple wrapper for UEditor
  // Priority 1 ensures editor components override stubs from nuxt-crouton
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonEditor',
        global: true,
        priority: 1
      }
    ]
  },

  // Auto-imports for composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Alias for types
  alias: {
    '#crouton-editor': join(currentDir, 'app')
  }
})
