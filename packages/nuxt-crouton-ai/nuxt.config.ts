import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('nuxt-crouton-ai')) {
  _dependencies.add('nuxt-crouton-ai')
  console.log('[nuxt-crouton-ai] ✓ AI layer loaded')
}

export default defineNuxtConfig({
  $meta: {
    description: 'AI integration layer for Nuxt Crouton',
    name: 'crouton-ai'
  },

  css: [
    join(currentDir, 'app/assets/css/translation.css')
  ],

  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'AI',
        global: true
      }
    ]
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  runtimeConfig: {
    // Server-only (API keys)
    openaiApiKey: '',
    anthropicApiKey: '',

    public: {
      croutonAI: {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o'
      }
    }
  },

  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    }
  }
})
