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
    './collections/categories',
    './collections/ateliers',
    './collections/persons',
    './collections/locations',
    './collections/news',
    './collections/downloads'
  ],
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' }
    ],
    langDir: './locales'
  }
})
