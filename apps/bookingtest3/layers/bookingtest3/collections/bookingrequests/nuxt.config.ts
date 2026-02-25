import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'bookingtest3-bookingrequests',
  },
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Bookingtest3BookingRequests',
        global: true
      }
    ]
  }
})