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
    './collections/bookingrequests',
    './collections/equipments',
    './collections/roomtypes',
    './collections/departments',
    './collections/members'
  ]
})
