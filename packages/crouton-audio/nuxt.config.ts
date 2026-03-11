import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-audio')) {
  _dependencies.add('crouton-audio')
  console.log('🍞 crouton:audio ✓ Layer loaded')
}

export default defineNuxtConfig({
  $meta: {
    description: 'Audio player addon layer for Crouton with waveform visualization (WaveSurfer.js)',
    name: 'crouton-audio',
  },

  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'CroutonAudio',
        global: true,
        priority: 1,
      },
    ],
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')],
  },

  alias: {
    '#crouton-audio': join(currentDir, 'app'),
  },
})
