import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    { input: 'module', name: 'module' },
  ],
  declaration: true,
  clean: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
  },
  externals: [
    'nuxt',
    '@nuxt/kit',
    '@nuxt/schema',
    'better-auth',
    'vue',
    'h3',
    '#imports',
  ],
})
