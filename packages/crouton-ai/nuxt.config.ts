import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-ai')) {
  _dependencies.add('crouton-ai')
  console.log('🍞 crouton:ai ✓ Layer loaded')
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
      },
      // AITranslateButton without prefix - overrides the stub from crouton-i18n
      {
        path: join(currentDir, 'app/components'),
        pattern: 'AITranslateButton.vue',
        prefix: '',
        global: true
      }
    ]
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  runtimeConfig: {
    // Server-only (API keys and model override)
    openaiApiKey: '',      // NUXT_OPENAI_API_KEY
    anthropicApiKey: '',   // NUXT_ANTHROPIC_API_KEY
    aiDefaultModel: '',    // NUXT_AI_DEFAULT_MODEL (optional, auto-detects from available keys)

    public: {
      croutonAI: {
        // These can be overridden in nuxt.config.ts crouton: { ai: { ... } }
        // But prefer using env vars or let it auto-detect from API keys
        defaultProvider: '',
        defaultModel: ''
      }
    }
  },

  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    }
  }
})
