import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-triage')) {
  _dependencies.add('crouton-triage')
  console.log('🍞 crouton:triage ✓ Layer loaded')
}

export default defineNuxtConfig({
  // Extend the AI layer for Claude-powered analysis
  extends: ['@fyit/crouton-ai'],

  // Note: This is an addon layer - users must explicitly extend:
  // extends: ['@fyit/crouton-core', '@fyit/crouton-triage', './layers/triage']

  $meta: {
    description: 'Discussion-to-task triage system with AI analysis, multi-source adapters, and domain routing',
    name: 'crouton-triage'
  },

  // Component configuration - prefixed with CroutonTriage
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonTriage',
        global: true
      }
    ]
  },

  // Auto-import composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Auto-import server utilities
  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    }
  },

  // Runtime config for triage features
  runtimeConfig: {
    // Server-only config
    croutonTriage: {
      anthropicApiKey: '',
      slack: {
        clientId: '',
        clientSecret: '',
        signingSecret: ''
      },
      resend: {
        apiKey: ''
      }
    },
    // Public config
    public: {
      croutonTriage: {
        enabled: true
      }
    }
  },

  // i18n configuration - translations auto-merge when this layer is extended
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: '../i18n/locales'
  }
})
