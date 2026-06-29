import { defineBuildConfig } from 'unbuild'

// Scaffold build (epic #960, WS1 / #961): only the module entry exists for now.
// Subsequent workstreams add runtime entries as code is moved in:
//   #962 → runtime/{components,composables,tools,plugins,overlay}
//   #963 → runtime/{server,transform}
// Each is an mkdist entry mirroring @fyit/crouton-devtools' build.config.ts.
export default defineBuildConfig({
  entries: [
    {
      input: 'src/module.ts',
      outDir: 'dist',
      name: 'module',
      format: 'esm'
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
