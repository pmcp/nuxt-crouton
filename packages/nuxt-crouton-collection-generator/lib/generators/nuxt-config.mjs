// Generator for nuxt.config.ts
import { PATH_CONFIG } from '../utils/paths.mjs'

export function generateNuxtConfig(data) {
  const { pascalCasePlural, layerPascalCase, layer, plural } = data

  // Generate the layer name for this collection
  const layerName = PATH_CONFIG.getLayerName(layer, plural)

  return `import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: '${layerName}',
  },
  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: '${layerPascalCase}${pascalCasePlural}',
        global: true
      }
    ]
  }
})`
}