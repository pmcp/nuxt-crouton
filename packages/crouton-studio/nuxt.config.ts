import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _globalWithLayers = globalThis as typeof globalThis & { __croutonLayers?: Set<string> }
_globalWithLayers.__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_globalWithLayers.__croutonLayers.has('crouton-studio')) {
  _globalWithLayers.__croutonLayers.add('crouton-studio')
  console.log('🍞 crouton:studio ✓ Layer loaded')
}

export default defineNuxtConfig({
  $meta: {
    description: 'AI-powered studio for building Nuxt apps with Crouton',
    name: 'crouton-studio'
  },

  extends: ['@fyit/crouton-ai'],

  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Studio',
        global: true
      }
    ]
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')]
  }
})