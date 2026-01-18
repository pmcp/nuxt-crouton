import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    { input: 'module', name: 'module' },
    { input: 'server/database/schema/auth', name: 'schema/auth' }
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
    'better-auth',
    'vue',
    'h3',
    '#imports',
    'drizzle-orm',
    'drizzle-orm/sqlite-core',
    'nanoid'
  ]
})
