import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-three')) {
  _dependencies.add('crouton-three')
  console.log('🍞 crouton:three ✓ Layer loaded')
}

export default defineNuxtConfig({
  $meta: {
    description: 'TresJS (Three.js for Vue) integration for Nuxt Crouton - 3D scenes, model viewer, and a 3D pages block',
    name: 'crouton-three'
  },

  // Extends crouton-core for app/block registration (useCroutonApps, useCroutonBlocks)
  extends: ['@fyit/crouton-core'],

  // Note: This is an addon layer - users explicitly extend it:
  // extends: ['@fyit/crouton-core', '@fyit/crouton-three']

  // Register the TresJS Nuxt module — auto-imports <TresCanvas>, wires up the
  // custom renderer, handles transpilation/SSR, and exposes the Tres catalogue
  // (any <Tres*> tag, e.g. <TresMesh>, <TresPerspectiveCamera>, <TresAmbientLight>).
  modules: ['@tresjs/nuxt'],

  // Component configuration — prefix 'CroutonThree'
  // Scene.vue → CroutonThreeScene, ModelViewer.vue → CroutonThreeModelViewer, etc.
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonThree',
        global: true
      }
    ]
  },

  // Composables auto-import (useThreeControls)
  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // i18n translations — merged by the @nuxtjs/i18n module when crouton-i18n is present.
  // Block strings (insert menu + property panel) use the `three.*` key namespace below.
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' }
    ],
    langDir: '../i18n/locales'
  }
})
