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
    './collections/__ext:bookings:bookings',
    './collections/promotions',
    './collections/reviews',
    './collections/staffs',
    './collections/services',
    './collections/customers'
  ]
})
