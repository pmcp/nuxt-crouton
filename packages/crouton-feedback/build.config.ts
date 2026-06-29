import { defineBuildConfig } from 'unbuild'

// epic #960. Module entry (rollup) + per-dir mkdist runtime entries. #963 adds
// runtime/{server,transform} as the Annotate tool + sink dispatcher move in.
export default defineBuildConfig({
  entries: [
    // Module entry point
    {
      input: 'src/module.ts',
      outDir: 'dist',
      name: 'module',
      format: 'esm'
    },
    // Client plugins: launcher mount + tool registrations (console)
    {
      input: 'src/runtime/plugins',
      outDir: 'dist/runtime/plugins',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    },
    // Tool registry composable
    {
      input: 'src/runtime/composables',
      outDir: 'dist/runtime/composables',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    },
    // Tool definitions: Console (eruda) factory
    {
      input: 'src/runtime/tools',
      outDir: 'dist/runtime/tools',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    },
    // Launcher SFC — mkdist compiles the .vue to .mjs (+ .css)
    {
      input: 'src/runtime/components',
      outDir: 'dist/runtime/components',
      builder: 'mkdist',
      pattern: ['**/*.vue'],
      loaders: ['vue', 'js']
    },
    // Shared overlay mount helper
    {
      input: 'src/runtime/overlay',
      outDir: 'dist/runtime/overlay',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    }
  ],
  declaration: true,
  clean: true,
  failOnWarn: false,
  externals: [
    '@nuxt/kit',
    '@nuxt/schema',
    'h3',
    'vue',
    'nuxt'
  ]
})
