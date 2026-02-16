import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    { input: 'module', name: 'module' }
  ],
  declaration: true,
  clean: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true
  },
  externals: [
    'nuxt',
    '@nuxt/kit',
    '@nuxt/schema',
    '@nuxtjs/mcp-toolkit',
    'vue',
    'h3',
    '#imports',
    'defu',
    'zod'
  ]
})
