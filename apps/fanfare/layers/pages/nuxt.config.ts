import { basename } from 'path'

const layerName = basename(__dirname)

export default defineNuxtConfig({
  components: {
    dirs: [
      {
        path: './components',
        prefix: layerName,
        global: true // Makes them available globally
      }
    ]
  },
  extends: [
    './collections/pages'
  ]
  // Locales come from the crouton packages, driven by crouton.config.js.
  // This layer ships no translations of its own (empty locales/ dir).
})
