import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    { input: 'module', name: 'module' },
    { input: 'types/', outDir: 'dist/types' },
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: [
    'nuxt',
    '@nuxt/kit',
    '@nuxt/schema',
    'better-auth',
    'vue',
    '#imports',
  ],
})
