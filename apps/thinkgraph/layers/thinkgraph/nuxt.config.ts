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
    './collections/decisions',
    './collections/chatconversations',
    './collections/graphs',
    './collections/canvases',
    './collections/nodes',
    './collections/injectrequests'
  ],
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' }
    ],
    langDir: './locales'
  }
})
