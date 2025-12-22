import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [],
  declaration: true,
  clean: true,
  failOnWarn: false,
  externals: [
    '@nuxt/kit',
    '@nuxt/schema',
    'h3',
    'vue',
    'nuxt',
    'zod',
    '@friendlyinternet/nuxt-crouton',
    '@internationalized/date',
    '@vueuse/core'
  ]
})
