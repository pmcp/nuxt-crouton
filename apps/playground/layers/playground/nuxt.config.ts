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
    '@fyit/crouton-i18n',
    './collections/tags',
    './collections/categories',
    './collections/posts',
    './collections/decisions',
    './collections/options'
  ],
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'nl', file: 'nl.json' },
      { code: 'fr', file: 'fr.json' }
    ],
    langDir: './locales'
  }
})
