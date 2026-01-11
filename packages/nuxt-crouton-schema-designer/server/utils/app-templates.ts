/**
 * Server-side template generators for Create App feature
 * Used when File System Access API is not available (Firefox/Safari)
 */

import {
  type MonorepoContext,
  detectMonorepoContext,
  getPackageDependency,
  getExtendsReference
} from './monorepo-detection'

/**
 * Configuration for a single collection
 */
export interface CollectionConfig {
  name: string
  schema: Record<string, unknown>
  hierarchy?: boolean
  sortable?: boolean
  seed?: boolean
  seedCount?: number
}

export interface AppTemplateOptions {
  projectName: string
  layerName: string
  /** Multiple collections to generate */
  collections: CollectionConfig[]
  dialect: 'sqlite' | 'pg'
  includeAuth: boolean
  includeI18n: boolean
  /** Monorepo context for local package references */
  monorepoContext?: MonorepoContext
}

export interface GeneratedFile {
  path: string
  content: string
}

/**
 * Generate package.json content
 */
export function generatePackageJson(options: AppTemplateOptions): string {
  const context = options.monorepoContext ?? detectMonorepoContext()

  const deps: Record<string, string> = {
    'nuxt': '^4.0.0',
    '@friendlyinternet/nuxt-crouton': getPackageDependency('crouton', context),
    // Drizzle ORM for NuxtHub database
    'drizzle-orm': '^0.45.0',
    '@libsql/client': '^0.15.0'
  }

  const devDeps: Record<string, string> = {
    '@nuxt/ui': '^4.0.0',
    '@nuxthub/core': 'latest',
    'typescript': '^5.0.0',
    'drizzle-kit': '^0.31.0'
  }

  if (options.includeAuth) {
    deps['@friendlyinternet/nuxt-crouton-auth'] = getPackageDependency('auth', context)
  }
  if (options.includeI18n) {
    deps['@friendlyinternet/nuxt-crouton-i18n'] = getPackageDependency('i18n', context)
  }

  return JSON.stringify({
    name: options.projectName,
    private: true,
    type: 'module',
    scripts: {
      dev: 'nuxt dev',
      build: 'nuxt build',
      preview: 'nuxt preview',
      generate: 'nuxt generate',
      typecheck: 'npx nuxt typecheck',
      'db:generate': 'npx nuxt db generate',
      'db:migrate': 'npx nuxt db migrate'
    },
    dependencies: deps,
    devDependencies: devDeps
  }, null, 2)
}

/**
 * Generate nuxt.config.ts content
 */
export function generateNuxtConfig(options: AppTemplateOptions): string {
  const context = options.monorepoContext ?? detectMonorepoContext()

  const extendsLayers = [`'${getExtendsReference('crouton', context)}'`]

  if (options.includeAuth) {
    extendsLayers.push(`'${getExtendsReference('auth', context)}'`)
  }
  if (options.includeI18n) {
    extendsLayers.push(`'${getExtendsReference('i18n', context)}'`)
  }
  extendsLayers.push(`'./layers/${options.layerName}'`)

  return `export default defineNuxtConfig({
  extends: [
    ${extendsLayers.join(',\n    ')}
  ],

  modules: [
    '@nuxt/ui',
    '@nuxthub/core'
  ],

  hub: {
    db: '${options.dialect}'
  },

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  compatibilityDate: '2025-01-01'
})
`
}

/**
 * Generate crouton.config.js content for multiple collections
 */
export function generateCroutonConfig(options: AppTemplateOptions): string {
  // Build collection configs
  const collectionConfigs = options.collections.map((col) => {
    const config: Record<string, any> = {
      name: col.name,
      fieldsFile: `./schemas/${col.name}.json`
    }

    if (col.hierarchy) config.hierarchy = true
    if (col.sortable) config.sortable = true
    if (col.seed) {
      config.seed = { count: col.seedCount || 25 }
    }

    return config
  })

  // All collection names for the target
  const collectionNames = options.collections.map(c => c.name)

  return `export default {
  dialect: '${options.dialect}',
  collections: [
    ${collectionConfigs.map(c => JSON.stringify(c, null, 4).split('\n').join('\n    ')).join(',\n    ')}
  ],
  targets: [
    {
      layer: '${options.layerName}',
      collections: ${JSON.stringify(collectionNames)}
    }
  ]
}
`
}

/**
 * Generate all template files for the project (multi-collection support)
 */
export function generateAllTemplates(options: AppTemplateOptions): GeneratedFile[] {
  const files: GeneratedFile[] = []

  // package.json
  files.push({
    path: 'package.json',
    content: generatePackageJson(options)
  })

  // nuxt.config.ts
  files.push({
    path: 'nuxt.config.ts',
    content: generateNuxtConfig(options)
  })

  // tsconfig.json
  files.push({
    path: 'tsconfig.json',
    content: JSON.stringify({ extends: './.nuxt/tsconfig.json' }, null, 2)
  })

  // app/assets/css/main.css
  files.push({
    path: 'app/assets/css/main.css',
    content: `@import "tailwindcss";
@import "@nuxt/ui";
`
  })

  // .env.example
  files.push({
    path: '.env.example',
    content: `# Database
NUXT_HUB_PROJECT_KEY=

# Auth (if using @friendlyinternet/nuxt-crouton-auth)
BETTER_AUTH_SECRET=your-32-char-secret-here
`
  })

  // NOTE: app.config.ts is NOT generated here - the crouton CLI creates it
  // at app/app.config.ts with proper collection registrations

  // server/db/schema.ts
  const schemaImports: string[] = []

  if (options.includeAuth) {
    schemaImports.push(`// Auth schema (Better Auth tables)
export * from '@friendlyinternet/nuxt-crouton-auth/server/database/schema/auth'`)
  }

  if (options.includeI18n) {
    schemaImports.push(`// I18n schema (translations table)
export * from '@friendlyinternet/nuxt-crouton-i18n/server/database/schema'`)
  }

  files.push({
    path: 'server/db/schema.ts',
    content: `// Auto-generated database schema exports
// Collections will register their schemas here
${schemaImports.length > 0 ? '\n' + schemaImports.join('\n\n') + '\n' : ''}
// Collection schemas will be added by the crouton CLI
export {}
`
  })

  // NOTE: Layer nuxt.config.ts is NOT generated here - the crouton CLI creates it
  // with proper extends array and component configuration

  // Schema JSON files for each collection
  for (const collection of options.collections) {
    files.push({
      path: `schemas/${collection.name}.json`,
      content: JSON.stringify(collection.schema, null, 2)
    })
  }

  // crouton.config.js
  files.push({
    path: 'crouton.config.js',
    content: generateCroutonConfig(options)
  })

  return files
}
