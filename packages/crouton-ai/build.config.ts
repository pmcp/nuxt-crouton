import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    {
      input: 'server/utils',
      outDir: 'dist/server/utils',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js'],
    },
    {
      input: 'app/composables',
      outDir: 'dist/app/composables',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js'],
    },
    {
      input: 'app/types',
      outDir: 'dist/app/types',
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
    'ai',
    '@ai-sdk/vue',
    '@ai-sdk/openai',
    '@ai-sdk/anthropic',
  ],
})
