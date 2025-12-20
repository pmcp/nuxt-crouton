import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    description: 'AI integration layer for Nuxt Crouton',
    name: 'crouton-ai'
  },

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
