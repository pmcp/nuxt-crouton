import { defineBuildConfig } from 'unbuild'
import { cpSync } from 'node:fs'

export default defineBuildConfig({
  entries: [
    // Module entry point
    {
      input: 'src/module.ts',
      outDir: 'dist',
      name: 'module',
      format: 'esm'
    },
    // Runtime server files (plugins, middleware, utils)
    {
      input: 'src/runtime/server',
      outDir: 'dist/runtime/server',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    },
    // Runtime RPC files (server handlers)
    {
      input: 'src/runtime/server-rpc',
      outDir: 'dist/runtime/server-rpc',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    },
    // Client plugins: launcher mount (#809) + tool registrations console/annotate (#810)
    {
      input: 'src/runtime/plugins',
      outDir: 'dist/runtime/plugins',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    },
    // Dev-tools registry + annotate composables (#809, #810)
    {
      input: 'src/runtime/composables',
      outDir: 'dist/runtime/composables',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    },
    // Dev-tool definitions: Console (eruda) + Annotate factories (#810)
    {
      input: 'src/runtime/tools',
      outDir: 'dist/runtime/tools',
      builder: 'mkdist',
      pattern: ['**/*.ts'],
      loaders: ['js']
    },
    // Dev-tools launcher SFC (#809) — mkdist compiles the .vue to .mjs (+ .css)
    {
      input: 'src/runtime/components',
      outDir: 'dist/runtime/components',
      builder: 'mkdist',
      pattern: ['**/*.vue'],
      loaders: ['vue', 'js']
    },
    // Pure capture helpers shared by the overlay (#489)
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
    '@nuxt/devtools-kit',
    '@nuxt/schema',
    'h3',
    'vue',
    'nuxt'
  ],
  hooks: {
    'build:done': () => {
      // Copy Vue pages to dist (they can't be transformed by mkdist)
      cpSync('src/runtime/pages', 'dist/runtime/pages', { recursive: true })
      // Copy raw client assets (HTML/CSS/JS) served by the devtools handler
      cpSync('src/runtime/client', 'dist/runtime/client', { recursive: true })
    }
  }
})
