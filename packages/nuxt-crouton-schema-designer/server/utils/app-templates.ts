/**
 * Server-side template generators for Create App feature
 * Used when File System Access API is not available (Firefox/Safari)
 */

export interface AppTemplateOptions {
  projectName: string
  collectionName: string
  layerName: string
  schema: Record<string, unknown>
  dialect: 'sqlite' | 'pg'
  includeAuth: boolean
  includeI18n: boolean
  hierarchy?: boolean
  sortable?: boolean
  seed?: boolean
  seedCount?: number
}

export interface GeneratedFile {
  path: string
  content: string
}

/**
 * Generate package.json content
 */
export function generatePackageJson(options: AppTemplateOptions): string {
  const deps: Record<string, string> = {
    'nuxt': '^4.0.0',
    '@friendlyinternet/nuxt-crouton': 'latest'
  }

  const devDeps: Record<string, string> = {
    '@nuxt/ui': '^3.0.0',
    '@nuxthub/core': 'latest',
    'typescript': '^5.0.0'
  }

  if (options.includeAuth) {
    deps['@friendlyinternet/nuxt-crouton-auth'] = 'latest'
  }
  if (options.includeI18n) {
    deps['@friendlyinternet/nuxt-crouton-i18n'] = 'latest'
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
  const extendsLayers = ["'@friendlyinternet/nuxt-crouton'"]

  if (options.includeAuth) {
    extendsLayers.push("'@friendlyinternet/nuxt-crouton-auth'")
  }
  if (options.includeI18n) {
    extendsLayers.push("'@friendlyinternet/nuxt-crouton-i18n'")
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
 * Generate crouton.config.js content
 */
export function generateCroutonConfig(options: AppTemplateOptions): string {
  const collectionConfig: Record<string, any> = {
    name: options.collectionName,
    fieldsFile: `./schemas/${options.collectionName}.json`
  }

  if (options.hierarchy) collectionConfig.hierarchy = true
  if (options.sortable) collectionConfig.sortable = true
  if (options.seed) {
    collectionConfig.seed = { count: options.seedCount || 25 }
  }

  return `export default {
  dialect: '${options.dialect}',
  collections: [
    ${JSON.stringify(collectionConfig, null, 4).split('\n').join('\n    ')}
  ],
  targets: [
    {
      layer: '${options.layerName}',
      collections: ['${options.collectionName}']
    }
  ]
}
`
}

/**
 * Generate all template files for the project
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
NUXT_SESSION_PASSWORD=your-32-char-secret-here
`
  })

  // app.config.ts
  files.push({
    path: 'app.config.ts',
    content: `export default defineAppConfig({
  // Collection registry will be auto-generated
})
`
  })

  // server/db/schema.ts
  files.push({
    path: 'server/db/schema.ts',
    content: `// Auto-generated database schema exports
// Collections will register their schemas here
export {}
`
  })

  // Layer nuxt.config.ts
  files.push({
    path: `layers/${options.layerName}/nuxt.config.ts`,
    content: `export default defineNuxtConfig({
  // Layer configuration
  // Collections will be added here after generation
})
`
  })

  // Schema JSON file
  files.push({
    path: `schemas/${options.collectionName}.json`,
    content: JSON.stringify(options.schema, null, 2)
  })

  // crouton.config.js
  files.push({
    path: 'crouton.config.js',
    content: generateCroutonConfig(options)
  })

  return files
}
