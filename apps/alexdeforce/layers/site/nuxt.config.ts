import { basename } from 'node:path'

const layerName = basename(__dirname)

export default defineNuxtConfig({
  components: {
    dirs: [{
      path: './app/components',
      prefix: layerName,
      global: true
    }]
  }
})
