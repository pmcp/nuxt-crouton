import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-editor',
    description: 'Rich text editor addon layer for FYIT collections (wraps Nuxt UI Editor)'
  },

  // Component configuration - provides CroutonEditorSimple as backwards-compatible wrapper
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonEditor',
        global: true
      }
    ]
  },

  // Add hooks for debugging component registration
  hooks: {
    'components:extend': (components) => {
      const editorComponents = components.filter(c => c.pascalName?.startsWith('CroutonEditor'))
      console.log('[nuxt-crouton-editor] Registered editor components:', editorComponents.map(c => c.pascalName))
    }
  }
})
