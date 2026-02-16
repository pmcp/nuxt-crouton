// scaffold-app.mjs — Generate a complete crouton app scaffold
import { join } from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import { MODULES } from './module-registry.mjs'
import { getFrameworkPackages } from './utils/framework-packages.mjs'

// ─── Template helpers ─────────────────────────────────────────────

/**
 * Resolve features list against module registry, validating each one
 * and resolving transitive dependencies.
 */
function resolveFeatures(featureNames) {
  const resolved = new Set()
  const errors = []

  for (const name of featureNames) {
    const mod = MODULES[name]
    if (!mod) {
      errors.push(name)
      continue
    }
    // Add transitive dependencies first
    if (mod.dependencies) {
      for (const dep of mod.dependencies) {
        resolved.add(dep)
      }
    }
    resolved.add(name)
  }

  if (errors.length > 0) {
    const available = Object.keys(MODULES).join(', ')
    throw new Error(
      `Unknown feature(s): ${errors.join(', ')}\nAvailable: ${available}`
    )
  }

  return [...resolved]
}

/**
 * Build workspace dependencies for package.json based on resolved features.
 * Bundled modules (auth, i18n, admin) are included via @fyit/crouton-core.
 */
function buildDependencies(features) {
  const deps = {
    '@fyit/crouton': 'workspace:*',
    '@fyit/crouton-core': 'workspace:*',
    '@libsql/client': '^0.17.0',
    'drizzle-orm': '^0.45.1',
    'nuxt': '^4.2.2',
    'vue': '^3.5.26',
    'vue-router': '^4.6.4'
  }

  for (const name of features) {
    const mod = MODULES[name]
    if (mod && !mod.bundled) {
      deps[mod.package] = 'workspace:*'
    }
  }

  return deps
}

/**
 * Build the features object for crouton.config.js
 * Only include non-bundled features that were explicitly requested.
 */
function buildFeaturesConfig(features) {
  const config = {}
  for (const name of features) {
    const mod = MODULES[name]
    if (mod && !mod.bundled) {
      config[name] = true
    }
  }
  return config
}

// ─── File templates ───────────────────────────────────────────────

function tmplPackageJson(vars) {
  const deps = buildDependencies(vars.features)
  const devDeps = {
    '@fyit/crouton-cli': 'workspace:*',
    'drizzle-kit': '^0.31.0'
  }
  if (vars.cf) {
    devDeps['wrangler'] = '^4.64.0'
  }

  const scripts = {
    build: 'nuxt build',
    dev: 'nuxt dev',
    generate: 'nuxt generate',
    preview: 'nuxt preview',
    postinstall: 'nuxt prepare'
  }
  if (vars.cf) {
    scripts['cf:deploy'] = 'nuxt build && npx wrangler pages deploy dist'
    scripts['cf:preview'] = 'nuxt build && npx wrangler pages deploy dist --branch preview'
    scripts['db:generate'] = 'drizzle-kit generate'
    scripts['db:migrate'] = `npx wrangler d1 migrations apply ${vars.name}-db --local`
    scripts['db:migrate:prod'] = `npx wrangler d1 migrations apply ${vars.name}-db --remote`
  }

  return JSON.stringify({
    name: vars.name,
    type: 'module',
    private: true,
    version: '0.1.0',
    scripts,
    dependencies: deps,
    devDependencies: devDeps
  }, null, 2) + '\n'
}

function tmplNuxtConfig(vars) {
  const extendsArr = vars.extends.map(p => `    '${p}'`).join(',\n')

  // Build nitro alias block for CF stubs
  let nitroBlock = ''
  if (vars.cf) {
    nitroBlock = `
  // Cloudflare Pages deployment
  nitro: {
    preset: 'cloudflare-pages',
    alias: {
      '@better-auth/passkey/client': resolve(cfStubs, 'client'),
      '@better-auth/passkey': cfStubs,
      'tsyringe': cfStubs,
      'reflect-metadata': cfStubs,
      '@peculiar/x509': cfStubs,
      '@simplewebauthn/server': cfStubs,
      'papaparse': cfStubs
    }
  }`
  }

  // Build optional config sections
  let emailBlock = ''
  if (vars.features.includes('email')) {
    emailBlock = `\n  croutonEmail: {\n    enabled: true\n  },\n`
  }

  // CF-specific imports
  const cfImports = vars.cf
    ? `import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

`
    : ''

  return `${cfImports}// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
${extendsArr}
  ],
  hub: {
    db: '${vars.dialect}',
    kv: true
  },
${emailBlock}
  // Disable OG Image to reduce bundle size for Cloudflare (saves ~4MB)
  ogImage: { enabled: false },

  // Disable passkeys for Cloudflare Workers (tsyringe incompatibility)
  croutonAuth: {
    methods: {
      passkeys: false
    }
  },
${nitroBlock}
})
`
}

function tmplCroutonConfig(vars) {
  const featuresConfig = buildFeaturesConfig(vars.features)
  const featuresStr = Object.entries(featuresConfig)
    .map(([k, v]) => `    ${k}: ${v}`)
    .join(',\n')

  return `export default {
  // Feature flags - which crouton packages to enable
  features: {
${featuresStr ? featuresStr + '\n' : ''}  },

  // Collections to generate (add your collections here)
  // Example:
  // collections: [
  //   { name: 'products', fieldsFile: './schemas/products.json' }
  // ],
  collections: [],

  // Target layers (add after creating collections)
  // Example:
  // targets: [
  //   { layer: 'shop', collections: ['products'] }
  // ],
  targets: [],

  dialect: '${vars.dialect}'
}
`
}

function tmplWranglerToml(vars) {
  return `# Cloudflare Pages configuration for ${vars.name}
# Deploy with: npx wrangler pages deploy dist/

name = "${vars.name}"
compatibility_date = "2024-09-02"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "dist"

# D1 Database binding
# Create with: npx wrangler d1 create ${vars.name}-db
[[d1_databases]]
binding = "DB"
database_name = "${vars.name}-db"
database_id = "TODO_REPLACE_WITH_REAL_ID"
migrations_dir = "server/db/migrations/sqlite"

# KV Namespace binding
# Create with: npx wrangler kv namespace create ${vars.name}-kv
[[kv_namespaces]]
binding = "KV"
id = "TODO_REPLACE_WITH_REAL_ID"

# Environment variables (set in Cloudflare dashboard or via wrangler secret)
# [vars]
# NUXT_PUBLIC_SITE_URL = "https://${vars.name}.pages.dev"
`
}

function tmplAppVue() {
  return `<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
`
}

function tmplEnvExample() {
  return `# Authentication (required)
BETTER_AUTH_SECRET=your-secret-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

# OAuth (optional)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# Email (optional)
# NUXT_RESEND_API_KEY=
# NUXT_EMAIL_FROM=noreply@yourdomain.com

# AI (optional)
# NUXT_ANTHROPIC_API_KEY=
`
}

function tmplGitignore() {
  return `# Nuxt dev/build outputs
.output
.data
.nuxt
.nitro
.cache
dist

# Node dependencies
node_modules

# Logs
logs
*.log

# Misc
.DS_Store
.fleet
.idea

# Local env files
.env
.env.*
!.env.example
.wrangler/
`
}

function tmplAppConfig() {
  return `import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig
  }
})
`
}

function tmplMainCss() {
  return `@import "tailwindcss";
@import "@nuxt/ui";

/* Scan Nuxt Crouton layers for Tailwind classes */
@source "../../../../node_modules/@fyit/crouton*/app/**/*.{vue,js,ts}";
`
}

function tmplSchemaTs() {
  return `// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package (includes teamSettings)
export * from '@fyit/crouton-auth/server/database/schema/auth'
export * from './translations-ui'
`
}

function tmplTranslationsUi(vars) {
  if (vars.dialect === 'pg') {
    return `import { nanoid } from 'nanoid'
import { pgTable, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core'

export const translationsUi = pgTable('translations_ui', {
  id: text('id').primaryKey().$default(() => nanoid()),
  userId: text('user_id').notNull(),
  teamId: text('team_id'),
  namespace: text('namespace').notNull().default('ui'),
  keyPath: text('key_path').notNull(),
  category: text('category').notNull(),
  values: text('values').$type<Record<string, string>>().notNull(),
  description: text('description'),
  isOverrideable: boolean('is_overrideable').notNull().default(true),
  createdAt: timestamp('created_at').notNull().$default(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$onUpdate(() => new Date())
}, (table) => ({
  uniqueTeamNamespaceKey: unique().on(table.teamId, table.namespace, table.keyPath)
}))

export type TranslationsUi = typeof translationsUi.$inferSelect
export type NewTranslationsUi = typeof translationsUi.$inferInsert
`
  }

  return `import { nanoid } from 'nanoid'
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'

export const translationsUi = sqliteTable('translations_ui', {
  id: text('id').primaryKey().$default(() => nanoid()),
  userId: text('user_id').notNull(),
  teamId: text('team_id'),
  namespace: text('namespace').notNull().default('ui'),
  keyPath: text('key_path').notNull(),
  category: text('category').notNull(),
  values: text('values', { mode: 'json' }).$type<Record<string, string>>().notNull(),
  description: text('description'),
  isOverrideable: integer('is_overrideable', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date())
}, (table) => ({
  uniqueTeamNamespaceKey: unique().on(table.teamId, table.namespace, table.keyPath)
}))

export type TranslationsUi = typeof translationsUi.$inferSelect
export type NewTranslationsUi = typeof translationsUi.$inferInsert
`
}

function tmplCfStubsIndex() {
  return `// Empty stubs for Cloudflare Workers incompatible packages
// These packages are used by passkeys which are disabled for CF deployments
export default {}

// tsyringe stubs
export const container = {}
export const injectable = () => () => {}
export const inject = () => () => {}
export const singleton = () => () => {}

// @better-auth/passkey stub
export const passkey = () => ({
  id: 'passkey',
  endpoints: {},
  middlewares: [],
  hooks: {}
})

// @simplewebauthn/server stubs
export const generateRegistrationOptions = () => Promise.resolve({})
export const verifyRegistrationResponse = () => Promise.resolve({ verified: false })
export const generateAuthenticationOptions = () => Promise.resolve({})
export const verifyAuthenticationResponse = () => Promise.resolve({ verified: false })
`
}

function tmplCfStubsClient() {
  return `// Empty stub for Cloudflare Workers incompatible packages
export default {}
export const client = {}

// @better-auth/passkey/client stub
export const passkeyClient = () => ({
  id: 'passkey-client',
  $InferServerPlugin: {},
  getAtoms: () => ({}),
  pathMethods: {}
})
`
}

// ─── Main scaffold function ──────────────────────────────────────

/**
 * @param {string} name - App name (kebab-case)
 * @param {Object} options
 * @param {string[]} options.features - Feature names
 * @param {string} [options.theme] - Theme name
 * @param {string} [options.dialect='sqlite'] - Database dialect
 * @param {boolean} [options.cf=true] - Include Cloudflare config
 * @param {boolean} [options.dryRun=false] - Preview without writing
 * @param {string} [options.outDir] - Override output directory (default: apps/<name>)
 */
export async function scaffoldApp(name, options = {}) {
  const {
    features: featureNames = [],
    theme,
    dialect = 'sqlite',
    cf = true,
    dryRun = false,
    outDir
  } = options

  // Validate name
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid app name "${name}". Use lowercase letters, numbers, and hyphens.`)
  }

  // Resolve features and their dependencies
  const features = resolveFeatures(featureNames)

  // Build extends array via framework-packages.mjs
  const featuresConfig = {}
  for (const f of features) {
    featuresConfig[f] = true
  }
  const frameworkPackages = getFrameworkPackages(featuresConfig)

  // Add theme to extends if specified
  if (theme) {
    frameworkPackages.push(`@fyit/crouton-themes/${theme}`)
  }

  // Add i18n to extends (it's bundled but bike-sheds adds it explicitly for i18n features)
  // Actually, framework-packages.mjs doesn't add bundled packages, which is correct.
  // But bike-sheds adds @fyit/crouton-i18n explicitly. Let's match that pattern
  // since i18n is always needed for translations-ui.
  if (!frameworkPackages.includes('@fyit/crouton-i18n')) {
    // Insert after crouton-core
    const coreIdx = frameworkPackages.indexOf('@fyit/crouton-core')
    frameworkPackages.splice(coreIdx + 1, 0, '@fyit/crouton-i18n')
  }

  const vars = { name, features, extends: frameworkPackages, theme, dialect, cf }

  // Build file list
  const files = [
    { path: 'package.json', content: tmplPackageJson(vars) },
    { path: 'nuxt.config.ts', content: tmplNuxtConfig(vars) },
    { path: 'crouton.config.js', content: tmplCroutonConfig(vars) },
    { path: 'app.vue', content: tmplAppVue() },
    { path: '.env.example', content: tmplEnvExample() },
    { path: '.gitignore', content: tmplGitignore() },
    { path: 'app/app.config.ts', content: tmplAppConfig() },
    { path: 'app/assets/css/main.css', content: tmplMainCss() },
    { path: 'server/db/schema.ts', content: tmplSchemaTs() },
    { path: 'server/db/translations-ui.ts', content: tmplTranslationsUi(vars) },
    { path: 'schemas/.gitkeep', content: '' }
  ]

  // Add Cloudflare-specific files
  if (cf) {
    files.push(
      { path: 'wrangler.toml', content: tmplWranglerToml(vars) },
      { path: 'server/utils/_cf-stubs/index.ts', content: tmplCfStubsIndex() },
      { path: 'server/utils/_cf-stubs/client.ts', content: tmplCfStubsClient() }
    )
  }

  const appDir = outDir || join('apps', name)

  // Dry run — just print what would be created
  if (dryRun) {
    console.log(chalk.cyan(`\n  Scaffold preview for ${chalk.bold(name)}\n`))
    console.log(chalk.gray(`  Directory: ${appDir}/\n`))
    console.log(chalk.gray('  Features:'), features.length > 0 ? features.join(', ') : '(none)')
    console.log(chalk.gray('  Extends:'), frameworkPackages.join(', '))
    console.log(chalk.gray('  Dialect:'), dialect)
    console.log(chalk.gray('  Cloudflare:'), cf ? 'yes' : 'no')
    if (theme) console.log(chalk.gray('  Theme:'), theme)
    console.log()
    for (const file of files) {
      console.log(chalk.green('  + ') + file.path)
    }
    console.log(chalk.gray(`\n  ${files.length} files would be created.\n`))
    return { files, appDir }
  }

  // Check if directory already exists
  if (await fs.pathExists(appDir)) {
    throw new Error(`Directory "${appDir}" already exists. Remove it first or choose a different name.`)
  }

  // Write all files
  console.log(chalk.cyan(`\n  Scaffolding ${chalk.bold(name)}...\n`))

  for (const file of files) {
    const filePath = join(appDir, file.path)
    await fs.ensureDir(join(filePath, '..'))
    await fs.writeFile(filePath, file.content, 'utf-8')
    console.log(chalk.green('  + ') + file.path)
  }

  // Print next steps
  console.log(chalk.cyan(`\n  Done! ${files.length} files created in ${appDir}/\n`))
  console.log(chalk.yellow('  Next steps:\n'))
  console.log(chalk.gray('  1.'), `cd ${appDir}`)
  console.log(chalk.gray('  2.'), 'pnpm install')
  console.log(chalk.gray('  3.'), 'Add your schemas to schemas/ directory')
  console.log(chalk.gray('  4.'), 'Update crouton.config.js with collections')
  console.log(chalk.gray('  5.'), 'crouton generate')
  if (cf) {
    console.log(chalk.gray('  6.'), 'Update wrangler.toml with real D1/KV IDs')
  }
  console.log()

  return { files, appDir }
}
