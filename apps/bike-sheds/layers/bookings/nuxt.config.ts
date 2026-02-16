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
    './collections/locations',
    './collections/bookings',
    './collections/settings'
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
