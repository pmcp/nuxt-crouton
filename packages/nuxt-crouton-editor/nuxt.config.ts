import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton-editor',
    description: 'Rich text editor addon layer for FYIT collections'
  },

  // Note: This is an addon layer - users must explicitly extend both:
  // extends: ['@friendlyinternet/nuxt-crouton', '@friendlyinternet/nuxt-crouton-editor']

  // Tiptap module configuration
  modules: ['nuxt-tiptap'],

  tiptap: {
    prefix: 'Tiptap'
  },

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Editor',
        global: true
      }
    ]
  },

  // Add hooks for debugging component registration
  hooks: {
    'components:extend': (components) => {
      const editorComponents = components.filter(c => c.pascalName?.startsWith('Editor'))
      console.log('[nuxt-crouton-editor] Registered editor components:', editorComponents.map(c => c.pascalName))
    }
  }
})