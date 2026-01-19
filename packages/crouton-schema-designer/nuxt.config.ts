import { join } from 'node:path'

const currentDir = import.meta.dirname

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-schema-designer')) {
  _dependencies.add('crouton-schema-designer')
  console.log('🍞 crouton:schema-designer ✓ Layer loaded')
}

export default defineNuxtConfig({
  // Layer metadata
  $meta: {
    name: '@crouton/schema-designer',
    version: '0.1.0'
  },

  // Modules
  modules: ['@vueuse/nuxt'],

  // Components from the layer - using absolute path like nuxt-crouton main package
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components/SchemaDesigner'),
        prefix: 'CroutonSchemaDesigner',
        global: true
      }
    ]
  },

  // Auto-imports from the layer
  imports: {
    dirs: ['app/composables']
  },

  // Alias for types
  alias: {
    '~/types': './app/types'
  },

  // Runtime config defaults
  runtimeConfig: {
    public: {
      crouton: {
        schemaDesigner: {
          // Schema designer page route prefix
          routePrefix: '/schema-designer'
        }
      }
    }
  },

  // Enable Vue runtime compiler for live template preview
  vue: {
    runtimeCompiler: true
  },

  // Compatibility
  compatibilityDate: '2025-01-01',

  // Nitro server config
  nitro: {
    imports: {
      dirs: ['server/utils']
    }
  }
})
