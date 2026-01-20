import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'demo',
    description: 'Demo layer for testing Studio'
  },
  extends: [
    './collections/tasks'
  ]
})
