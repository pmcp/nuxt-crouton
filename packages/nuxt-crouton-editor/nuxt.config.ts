import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'Rich text editor addon layer for Crouton collections (wraps Nuxt UI Editor)',
    name: 'nuxt-crouton-editor'
  },

  // Component configuration - provides CroutonEditorSimple wrapper for UEditor
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
