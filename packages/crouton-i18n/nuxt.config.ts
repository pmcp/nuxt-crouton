import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-i18n')) {
  _dependencies.add('crouton-i18n')
  console.log('🍞 crouton:i18n ✓ Layer loaded (locales: en, nl, fr)')
}

export default defineNuxtConfig({

  // Note: This is an addon layer - users must explicitly extend both:
  // extends: ['@fyit/crouton-core', '@fyit/crouton-i18n']

  // Route rules for SWR caching (Nuxt 4.3+)
  // NOTE: ISR/SWR route rules with wildcards can break routes from extended layers in Nitro 2.13.x
  // The glob patterns interfere with layer route resolution, causing handlers to never execute.
  // See: https://github.com/nuxt/nuxt/issues/33140, https://github.com/nuxt/nuxt/issues/32192
  // Disabled until Nitro fixes layer route + routeRules interaction
  // routeRules: {
  //   '/api/teams/*/settings/translations': { swr: 600 },
  //   '/api/teams/*/translations-ui/**': { swr: 600 }
  // },

  // Add i18n module
  modules: ['@nuxtjs/i18n'],
  $meta: {
    description: 'i18n addon layer for FYIT collections',
    name: 'crouton-i18n'
  },

  // Component configuration
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonI18n',
        global: true
      },
      // AITranslateButton stub without prefix - allows crouton-ai to override it
      // with the real implementation that has the same name
      {
        path: join(currentDir, 'app/components'),
        pattern: 'AITranslateButton.vue',
        prefix: '',
        global: true
      }
    ]
  },

  // Composables
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // i18n configuration
  i18n: {
    bundle: {
      optimizeTranslationDirective: false
    },
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: '../locales', // Relative to srcDir (app/)
    defaultLocale: 'en',
    strategy: 'no_prefix', // Team routes handle locale manually: /team/en/page, /team/fr/page
    // Disable automatic redirects - we handle locale in public page routes only
    detectBrowserLanguage: false
  }
})
