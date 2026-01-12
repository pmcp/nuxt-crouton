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

  // Auto-imports for composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Alias for types
  alias: {
    '#crouton-editor': join(currentDir, 'app')
  },

  // Add hooks for debugging component registration
  hooks: {
    'components:extend': (components: Array<{ pascalName?: string }>) => {
      const editorComponents = components.filter((c: { pascalName?: string }) => c.pascalName?.startsWith('CroutonEditor'))
      console.log('[nuxt-crouton-editor] Registered editor components:', editorComponents.map((c: { pascalName?: string }) => c.pascalName))
    }
  }
})
