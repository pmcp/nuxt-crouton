import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'bookingtest3-members',
  },
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Bookingtest3Members',
        global: true
      }
    ]
  }
})