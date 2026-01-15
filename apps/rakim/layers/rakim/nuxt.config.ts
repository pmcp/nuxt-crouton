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
    './collections/discussions',
    './collections/configs',
    './collections/jobs',
    './collections/tasks',
    './collections/usermappings',
    './collections/inboxmessages',
    './collections/flows',
    './collections/flowinputs',
    './collections/flowoutputs'
  ]
})
