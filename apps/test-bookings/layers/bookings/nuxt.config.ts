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
    '@friendlyinternet/nuxt-crouton-i18n',
    './collections/locations',
    './collections/bookings',
    './collections/settings',
    './collections/emailtemplates',
    './collections/emaillogs'
  ]
})
