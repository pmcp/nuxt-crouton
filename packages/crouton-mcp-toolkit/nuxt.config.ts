import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-mcp-toolkit')) {
  _dependencies.add('crouton-mcp-toolkit')
  console.log('🍞 crouton:mcp-toolkit ✓ Layer loaded')
}

export default defineNuxtConfig({
  modules: [
    join(currentDir, 'module.ts')
  ],

  $meta: {
    name: '@crouton/mcp-toolkit',
    version: '0.1.0'
  },

  compatibilityDate: '2024-11-01'
})
