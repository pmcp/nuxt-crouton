import { basename, join } from 'node:path'

const currentDir = import.meta.dirname || __dirname
const layerName = basename(currentDir)

export default defineNuxtConfig({
  components: {
    dirs: [{
      path: join(currentDir, 'app/components'),
      prefix: layerName,
      global: true
    }]
  }
})
