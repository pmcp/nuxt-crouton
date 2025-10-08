import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    // Connector entry points - compile TypeScript to JavaScript
    {
      input: 'connectors',
      outDir: 'dist/connectors',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js'],
    },
  ],
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
  ],
})
