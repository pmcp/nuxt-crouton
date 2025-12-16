#!/usr/bin/env node
// generate-collection.next.mjs — Complete collection generator with modular architecture

import fsp from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Helper function to check if file exists
async function fileExists(filePath) {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

// Import utilities
import { toCase, toSnakeCase, mapType, typeMapping } from './utils/helpers.mjs'
import { DIALECTS } from './utils/dialects.mjs'
import { detectRequiredDependencies, displayMissingDependencies, ensureLayersExtended } from './utils/module-detector.mjs'
import { detectExternalReferences, getConnectorRecommendations, formatExternalReferences } from './utils/connector-detector.mjs'
import { setupConnectorInteractive, installConnectorPackage, addConnectorToNuxtConfig, updateAppConfigWithPackageImport } from './utils/connector-installer.mjs'
import { setupCroutonCssSource, displayManualCssSetupInstructions } from './utils/css-setup.mjs'

// Import generators
import { generateFormComponent } from './generators/form-component.mjs'
import { generateListComponent } from './generators/list-component.mjs'
import { generateComposable } from './generators/composable.mjs'
import { generateCollectionReadme } from './generators/collection-readme.mjs'
import {
  generateGetEndpoint,
  generatePostEndpoint,
  generatePatchEndpoint,
  generateDeleteEndpoint,
  generateMoveEndpoint,
  generateReorderEndpoint
} from './generators/api-endpoints.mjs'
import {
  generateGetEndpointSimplified,
  generatePostEndpointSimplified,
  generatePatchEndpointSimplified,
  generateDeleteEndpointSimplified
} from './generators/api-endpoints-simplified.mjs'
import { generateQueries } from './generators/database-queries.mjs'
import { generateSchema } from './generators/database-schema.mjs'
import { generateTypes } from './generators/types.mjs'
import { generateNuxtConfig } from './generators/nuxt-config.mjs'
import { generateTeamAuthUtility, getTeamAuthUtilityPath } from './generators/team-auth-utility.mjs'
import { generateRepeaterItemComponent } from './generators/repeater-item-component.mjs'
import { generateFieldComponents } from './generators/field-components.mjs'

function parseArgs() {
  const a = process.argv.slice(2)
  const pos = a.filter(x => !x.startsWith('--'))
  const layerFlag = a.find(x => x.startsWith('--layer='))
  
  let layer, collection
  if (pos.length >= 2 && !layerFlag) { 
    layer = pos[0]
    collection = pos[1] 
  } else { 
    collection = pos[0]
    layer = layerFlag ? layerFlag.split('=')[1] : null 
  }
  
  // Parse fields-file option (supports both --fields-file <path> and --fields-file=<path>)
  let fieldsFile = null
  const idxFile = a.indexOf('--fields-file')
  if (idxFile !== -1 && a[idxFile + 1]) {
    fieldsFile = a[idxFile + 1]
  } else {
    const fieldsFileFlag = a.find(x => x.startsWith('--fields-file='))
    if (fieldsFileFlag) {
      fieldsFile = fieldsFileFlag.split('=')[1]
    }
  }
  const dialect = (a.find(x => x.startsWith('--dialect=')) || '').split('=')[1] || 'pg'
  const autoRelations = a.includes('--auto-relations')
  const dryRun = a.includes('--dry-run')
  const noDb = a.includes('--no-db')
  const force = a.includes('--force')
  const noTranslations = a.includes('--no-translations')
  const useTeamUtility = a.includes('--use-team-utility')
  const hierarchy = a.includes('--hierarchy')

  if (!layer || !collection) {
    console.log('Usage: node scripts/generate-collection.next.mjs <layer> <collection> [--fields-file <path>] [--dialect=pg|sqlite] [--auto-relations] [--dry-run] [--no-db] [--force] [--no-translations] [--use-team-utility] [--hierarchy]')
    process.exit(1)
  }

  return { layer, collection, fieldsFile, dialect, autoRelations, dryRun, noDb, force, noTranslations, useTeamUtility, hierarchy }
}

async function loadFields(p) {
  // If path is relative and doesn't exist, check in schemas directory
  if (!path.isAbsolute(p) && !await fsp.access(p).then(() => true).catch(() => false)) {
    const schemasPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'schemas', p)
    if (await fsp.access(schemasPath).then(() => true).catch(() => false)) {
      p = schemasPath
    }
  }
  const raw = await fsp.readFile(p, 'utf8')
  const obj = JSON.parse(raw)

  // Convert to array for easier processing
  return Object.entries(obj).map(([name, meta]) => {
    const fieldMeta = meta?.meta || {}
    // Set default area if not specified
    if (!fieldMeta.area) {
      fieldMeta.area = 'main'
    }

    return {
      name,
      type: mapType(meta?.type),
      meta: fieldMeta,
      refTarget: meta?.refTarget,
      refScope: meta?.refScope,
      zod: typeMapping[mapType(meta?.type)]?.zod || 'z.string()',
      default: typeMapping[mapType(meta?.type)]?.default || "''",
      tsType: typeMapping[mapType(meta?.type)]?.tsType || 'string'
    }
  })
}

// Update the main schema index to export the new collection schema
async function updateSchemaIndex(collectionName, layer, force = false) {
  const cases = toCase(collectionName)
  const schemaIndexPath = path.resolve('server', 'database', 'schema', 'index.ts')
  
  // Generate the export name (layer-prefixed)
  // Convert layer to camelCase to ensure valid JavaScript identifier
  const layerCamelCase = layer
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const exportName = `${layerCamelCase}${cases.plural.charAt(0).toUpperCase() + cases.plural.slice(1)}`
  
  try {
    let content = await fsp.readFile(schemaIndexPath, 'utf-8')
    
    // Check for existing conflicts
    const baseTableRegex = new RegExp(`export.*\\b${cases.plural}\\b.*from`, 'g')
    const existingExport = content.match(baseTableRegex)
    
    if (existingExport && !force) {
      console.error(`⚠️  Warning: Found existing export for "${cases.plural}" in schema index`)
      console.error(`   This might cause conflicts. Use --force to override or choose a different name.`)
      console.error(`   Existing export: ${existingExport[0]}`)
      return false
    }
    
    // Check if this specific export already exists
    const specificExportRegex = new RegExp(`export\\s*{[^}]*${exportName}[^}]*}\\s*from\\s*['"].*${layer}/collections/${cases.plural}`, 'g')
    if (content.match(specificExportRegex)) {
      console.log(`✓ Schema index already contains ${exportName} export`)
      return true
    }

    // Add named export for the new collection schema
    // Use relative path for Drizzle compatibility (drizzle-kit doesn't understand Nuxt aliases)
    const exportLine = `export { ${exportName} } from '../../../layers/${layer}/collections/${cases.plural}/server/database/schema'`
    
    // Add the new export at the end of the file
    content = content.trim() + '\n' + exportLine + '\n'
    
    await fsp.writeFile(schemaIndexPath, content)
    console.log(`✓ Updated schema index with ${exportName} export`)
    return true
  } catch (error) {
    console.error(`! Could not update schema index:`, error.message)
    return false
  }
}

// Register translationsUi collection in app.config.ts
async function registerTranslationsUiCollection() {
  // Check if app/ directory exists (Nuxt 4 default structure)
  const appDirExists = await fsp.stat(path.resolve('app')).then(() => true).catch(() => false)
  const registryPath = appDirExists
    ? path.resolve('app/app.config.ts')
    : path.resolve('app.config.ts')

  const importStatement = `import { translationsUiConfig } from '@friendlyinternet/nuxt-crouton-i18n/app/composables/useTranslationsUi'`
  const collectionKey = 'translationsUi'
  const configName = 'translationsUiConfig'

  try {
    let content
    let fileExists = false

    // Try to read existing file
    try {
      content = await fsp.readFile(registryPath, 'utf8')
      fileExists = true
    } catch (readError) {
      // File doesn't exist, create it with initial content
      console.log(`↻ Creating app.config.ts with translationsUi collection`)
      content = `${importStatement}\n\nexport default defineAppConfig({\n  croutonCollections: {\n    ${collectionKey}: ${configName},\n  }\n})\n`
      await fsp.writeFile(registryPath, content)
      console.log(`✓ Created app.config.ts with translationsUi collection`)
      return true
    }

    // Check if already registered
    if (content.includes('translationsUi:') || content.includes('translationsUiConfig')) {
      console.log(`✓ translationsUi collection already registered in app.config.ts`)
      return false
    }

    // Ensure import is present
    if (!content.includes(importStatement)) {
      const importBlockMatch = content.match(/^(?:import[^\n]*\n)*/)
      if (importBlockMatch && importBlockMatch[0]) {
        const existingImports = importBlockMatch[0]
        content = content.replace(existingImports, `${existingImports}${importStatement}\n`)
      } else {
        content = `${importStatement}\n\n${content}`
      }
    }

    // Insert entry into croutonCollections
    const entryLine = `    ${collectionKey}: ${configName},`
    const collectionsBlockRegex = /croutonCollections:\s*{\s*\n/

    if (!collectionsBlockRegex.test(content)) {
      // No croutonCollections block yet, add one
      content = content.replace(
        'defineAppConfig({',
        `defineAppConfig({\n  croutonCollections: {\n${entryLine}\n  },`
      )
    } else {
      content = content.replace(collectionsBlockRegex, match => `${match}${entryLine}\n`)
    }

    await fsp.writeFile(registryPath, content)
    console.log(`✓ Registered translationsUi collection in app.config.ts`)
    return true
  } catch (error) {
    console.error(`! Could not register translationsUi collection:`, error.message)
    console.log(`  Please manually add to app.config.ts:`)
    console.log(`    import { translationsUiConfig } from '@friendlyinternet/nuxt-crouton-i18n/app/composables/useTranslationsUi'`)
    console.log(`    croutonCollections: { translationsUi: translationsUiConfig }`)
    return false
  }
}

// Export i18n schema when translations are enabled
async function exportI18nSchema(force = false) {
  const schemaDir = path.resolve('server', 'database', 'schema')
  const schemaIndexPath = path.join(schemaDir, 'index.ts')
  const translationsSchemaPath = path.join(schemaDir, 'translations-ui.ts')

  try {
    // Check if translations schema file already exists
    const schemaExists = await fileExists(translationsSchemaPath)

    if (schemaExists && !force) {
      console.log(`✓ Translations schema already exists`)
      // Still register the collection in app.config.ts
      await registerTranslationsUiCollection()
      return false
    }

    // Copy the schema file from the i18n package to local schema directory
    const i18nSchemaSource = `import { nanoid } from 'nanoid'
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'

/**
 * UI translations table for system translations and team-specific overrides
 *
 * System translations: teamId = null, isOverrideable = true
 * Team overrides: teamId = specific team ID
 */
export const translationsUi = sqliteTable('translations_ui', {
  id: text('id').primaryKey().$default(() => nanoid()),
  userId: text('user_id').notNull(),
  teamId: text('team_id'), // null means system/default translation
  namespace: text('namespace').notNull().default('ui'),
  keyPath: text('key_path').notNull(),
  category: text('category').notNull(),
  values: text('values', { mode: 'json' }).$type<Record<string, string>>().notNull(),
  description: text('description'),
  isOverrideable: integer('is_overrideable', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date())
}, (table) => ({
  // Ensures unique combination of teamId + namespace + keyPath
  uniqueTeamNamespaceKey: unique().on(table.teamId, table.namespace, table.keyPath)
}))

export type TranslationsUi = typeof translationsUi.$inferSelect
export type NewTranslationsUi = typeof translationsUi.$inferInsert
`

    await fsp.writeFile(translationsSchemaPath, i18nSchemaSource)
    console.log(`✓ Created translations-ui.ts schema file`)

    // Update schema index to export from local file
    let content = await fsp.readFile(schemaIndexPath, 'utf-8')

    const exportLine = `export * from './translations-ui'`

    // Check if already exported
    if (content.includes('translations-ui')) {
      console.log(`✓ Schema index already exports translations-ui`)
      return false
    }

    // Add the export
    content = content.trim() + '\n' + exportLine + '\n'
    await fsp.writeFile(schemaIndexPath, content)
    console.log(`✓ Added translations-ui to schema index`)

    // Generate migration for the new table
    console.log(`↻ Generating migration for translations_ui table...`)
    console.log(`! Running: pnpm db:generate (30s timeout)`)

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command timed out after 30 seconds')), 30000)
      })

      const { stdout, stderr } = await Promise.race([
        execAsync('pnpm db:generate'),
        timeoutPromise
      ])

      if (stderr && !stderr.includes('Warning')) {
        console.error(`! Drizzle warnings:`, stderr)
      }
      console.log(`✓ Migration generated for translations_ui table`)
      console.log(`! Migration will be applied when you restart the dev server.`)

      // Register the translationsUi collection in app.config.ts
      await registerTranslationsUiCollection()

      return true
    } catch (execError) {
      if (execError.message.includes('timed out')) {
        console.error(`✗ Migration generation timed out after 30 seconds`)
      } else {
        console.error(`✗ Failed to generate migration:`, execError.message)
      }
      console.log(`! You can manually run: pnpm db:generate`)

      // Still register the collection even if migration failed
      await registerTranslationsUiCollection()

      return true // Still return true since schema export succeeded
    }
  } catch (error) {
    console.error(`! Could not export i18n schema:`, error.message)
    return false
  }
}

// Create database table using Drizzle
async function createDatabaseTable(config) {
  const { name, layer, force = false } = config
  const cases = toCase(name)
  
  try {
    // Verify the schema file exists
    const schemaPath = path.resolve('layers', layer, 'collections', cases.plural, 'server', 'database', 'schema.ts')
    
    try {
      await fsp.access(schemaPath)
    } catch {
      console.error(`✗ Schema file not found at ${schemaPath}`)
      return false
    }
    
    // First, update the schema index to include the new collection
    console.log(`↻ Updating schema index...`)
    const schemaUpdated = await updateSchemaIndex(name, layer, force)
    
    if (!schemaUpdated) {
      console.error(`✗ Schema index update failed due to conflicts`)
      console.error(`  Skipping database migration to avoid errors`)
      console.error(`  You can:`)
      console.error(`  1. Use --force to override the conflict`)
      console.error(`  2. Manually resolve the conflict in server/database/schema/index.ts`)
      console.error(`  3. Choose a different collection name`)
      return false
    }
    
    // Run db:generate to sync with database (with timeout)
    console.log(`↻ Creating database migration...`)
    console.log(`! Running: pnpm db:generate (30s timeout)`)
    
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command timed out after 30 seconds')), 30000)
      })
      
      // Race between the command and timeout
      const { stdout, stderr } = await Promise.race([
        execAsync('pnpm db:generate'),
        timeoutPromise
      ])
      
      if (stderr && !stderr.includes('Warning')) {
        console.error(`! Drizzle warnings:`, stderr)
      }
      console.log(`✓ Database migration generated`)
      
      // Note: The migration has been generated but needs to be applied
      console.log(`! Migration generated. The table will be created when you restart the dev server.`)
      
      return true
    } catch (execError) {
      if (execError.message.includes('timed out')) {
        console.error(`✗ Database migration timed out after 30 seconds`)
        console.error(`  This usually means there's a conflict or error in the schema`)
        console.error(`  Check server/database/schema/index.ts for duplicate exports`)
      } else {
        console.error(`✗ Failed to run database migration:`, execError.message)
      }
      console.log(`! You can manually run: pnpm db:generate && pnpm db:push`)
      return false
    }
  } catch (error) {
    console.error(`✗ Failed to create database table:`, error.message)
    console.log(`! You may need to create the table manually with: pnpm db:generate && pnpm db:push`)
    return false
  }
}

// Update collection registry with new collection
async function updateRegistry({ layer, collection, collectionKey, configExportName, layerPascalCase, pascalCasePlural }) {
  // Check if app/ directory exists (Nuxt 4 default structure)
  const appDirExists = await fsp.stat(path.resolve('app')).then(() => true).catch(() => false)
  const registryPath = appDirExists
    ? path.resolve('app/app.config.ts')
    : path.resolve('app.config.ts')

  // Determine the path to the generated composable config
  const composablePath = path.resolve(
    'layers',
    layer,
    'collections',
    collection,
    'app',
    'composables',
    `use${layerPascalCase}${pascalCasePlural}.ts`
  )

  const relativeImport = path.relative(path.dirname(registryPath), composablePath).replace(/\\/g, '/')
  const importPath = relativeImport.startsWith('.') ? relativeImport : `./${relativeImport}`
  const importPathWithoutExtension = importPath.replace(/(\.ts|\.mts|\.cts|\.js|\.mjs|\.cjs)$/, '')
  const importStatement = `import { ${configExportName} } from '${importPathWithoutExtension}'`

  try {
    let content
    let fileExists = false

    // Try to read existing file
    try {
      content = await fsp.readFile(registryPath, 'utf8')
      fileExists = true
    } catch (readError) {
      // File doesn't exist, create it with initial content
      console.log(`↻ Creating app.config.ts with crouton collections`)
      content = `${importStatement}\n\nexport default defineAppConfig({\n  croutonCollections: {\n    ${collectionKey}: ${configExportName},\n  }\n})\n`
    }

    // Ensure import is present
    if (!content.includes(importStatement)) {
      const importBlockMatch = content.match(/^(?:import[^\n]*\n)*/)
      if (importBlockMatch && importBlockMatch[0]) {
        const existingImports = importBlockMatch[0]
        content = content.replace(existingImports, `${existingImports}${importStatement}\n`)
      } else {
        content = `${importStatement}\n\n${content}`
      }
    }

    // Check if entry already exists
    if (content.includes(`${collectionKey}:`)) {
      console.log(`⚠️  Collection "${collectionKey}" already in registry`)
      await fsp.writeFile(registryPath, content)
      return
    }

    // Insert new entry into croutonCollections
    const entryLine = `    ${collectionKey}: ${configExportName},`
    const collectionsBlockRegex = /croutonCollections:\s*{\s*\n/

    if (!collectionsBlockRegex.test(content)) {
      // No croutonCollections block yet, add one
      // Check for external connector imports (e.g., usersConfig) and preserve them
      const externalConnectorImports = content.match(/import\s+{\s*(\w+Config)\s*}\s+from\s+['"]@friendlyinternet\/nuxt-crouton-supersaas\//g)
      let additionalEntries = ''

      if (externalConnectorImports) {
        for (const importLine of externalConnectorImports) {
          const configMatch = importLine.match(/{\s*(\w+Config)\s*}/)
          if (configMatch) {
            const configName = configMatch[1]
            const collectionName = configName.replace('Config', '')
            // Only add if not already in content
            if (!content.includes(`${collectionName}:`)) {
              additionalEntries += `    ${collectionName}: ${configName},\n`
            }
          }
        }
      }

      content = content.replace(
        'defineAppConfig({',
        `defineAppConfig({\n  croutonCollections: {\n${additionalEntries}${entryLine}\n  },`
      )
    } else {
      content = content.replace(collectionsBlockRegex, match => `${match}${entryLine}\n`)
    }

    // Clean up placeholder comments if present
    content = content.replace(/\s*\/\/\s*Collections will be added here by the generator\s*/g, '')

    await fsp.writeFile(registryPath, content)
    console.log(`✓ ${fileExists ? 'Updated' : 'Created'} app.config.ts with "${collectionKey}" entry`)
  } catch (error) {
    console.error('Failed to update registry:', error)
    // Don't fail the entire generation if registry update fails
  }
}

// Update root nuxt.config.ts to extend the layer
async function updateRootNuxtConfig(layer) {
  const rootConfigPath = path.resolve('nuxt.config.ts')
  
  try {
    let config = await fsp.readFile(rootConfigPath, 'utf-8')
    
    // Find the extends array
    const extendsMatch = config.match(/extends:\s*\[([\s\S]*?)\]/m)
    if (extendsMatch) {
      const currentExtends = extendsMatch[1]
      const layerPath = `'./layers/${layer}'`
      
      // Check if layer is already in extends
      if (!currentExtends.includes(layerPath)) {
        // Parse existing entries
        const lines = currentExtends.split('\n')
          .map(line => line.trim().replace(/,?\s*$/, '')) // Remove trailing commas first
          .filter(line => line && line !== ',' && !line.startsWith('//')) // Filter empty lines, standalone commas, and comments

        // Deduplicate entries (normalize quotes and check for duplicates)
        const normalizedLines = [...new Set(lines.map(l => l.replace(/['"]/g, "'")))]

        // Only add if not already present (normalized check)
        if (!normalizedLines.some(l => l === layerPath)) {
          normalizedLines.push(layerPath)
        }

        // Add proper indentation and commas
        const formattedLines = normalizedLines.map((line, index) => {
          const trimmedLine = line.trim()
          const indentedLine = `    ${trimmedLine}`
          return index < normalizedLines.length - 1 ? indentedLine + ',' : indentedLine
        })
        
        const updatedExtends = formattedLines.join('\n')
        config = config.replace(extendsMatch[0], `extends: [\n${updatedExtends}\n  ]`)
        
        await fsp.writeFile(rootConfigPath, config)
        console.log(`✓ Updated root nuxt.config.ts to extend layer '${layer}'`)
      } else {
        console.log(`✓ Root nuxt.config.ts already extends layer '${layer}'`)
      }
    } else {
      console.error(`! Could not find extends array in root nuxt.config.ts`)
      console.log(`  Please manually add './layers/${layer}' to the extends array`)
    }
  } catch (error) {
    console.error(`! Could not update root nuxt.config.ts:`, error.message)
    console.log(`  Please manually add './layers/${layer}' to the extends array`)
  }
}

// Update or create layer root nuxt.config.ts
async function updateLayerRootConfig(layer, collectionName, hasTranslations = false) {
  const cases = toCase(collectionName)
  const layerPath = path.resolve('layers', layer)
  const configPath = path.join(layerPath, 'nuxt.config.ts')

  try {
    let config
    let configExists = false

    // Check if config already exists
    try {
      config = await fsp.readFile(configPath, 'utf-8')
      configExists = true
    } catch (readError) {
      // Create new config
      console.log(`↻ Creating ${layer} layer root nuxt.config.ts`)

      // Include i18n config if translations are enabled
      const i18nBlock = hasTranslations ? `,
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'nl', file: 'nl.json' },
      { code: 'fr', file: 'fr.json' }
    ],
    langDir: './locales'
  }` : ''

      config = `import { basename } from 'path'

const layerName = basename(__dirname)

export default defineNuxtConfig({
  components: {
    dirs: [
      {
        path: './components',
        prefix: layerName,
        global: true // Makes them available globally
      }
    ]
  },
  extends: [
  ]${i18nBlock}
})
`
    }
    
    // Find the extends array
    const extendsMatch = config.match(/extends:\s*\[([\s\S]*?)\]/m)
    if (extendsMatch) {
      const currentExtends = extendsMatch[1]
      const newCollection = `'./collections/${cases.plural}'`
      const translationsLayer = `'@friendlyinternet/nuxt-crouton-i18n'`

      // Parse existing entries
      let lines = currentExtends.split('\n')
        .map(line => line.trim().replace(/,$/, ''))
        .filter(line => line && line !== ',' && !line.startsWith('//'))

      // Deduplicate entries (normalize quotes for comparison)
      lines = [...new Set(lines.map(l => l.replace(/['"]/g, "'")))]

      let needsUpdate = false

      // Check if collection needs to be added (with normalized check)
      if (!lines.some(l => l === newCollection)) {
        lines.push(newCollection)
        needsUpdate = true
      }

      // Check if translations layer needs to be added (when using translations)
      if (hasTranslations && !lines.some(l => l === translationsLayer) && !lines.some(l => l.includes('translations'))) {
        // Add translations layer at the beginning for proper component resolution
        lines.unshift(translationsLayer)
        needsUpdate = true
        console.log(`↻ Adding translations layer to ${layer} config for TranslationsInput component`)
      }

      if (needsUpdate) {
        // Format with proper indentation
        const formattedLines = lines.map((line, index) => {
          return index < lines.length - 1 ? `    ${line},` : `    ${line}`
        })

        const updatedExtends = formattedLines.join('\n')
        config = config.replace(extendsMatch[0], `extends: [\n${updatedExtends}\n  ]`)
      }

      // Add i18n config to existing configs if translations are enabled and not present
      if (hasTranslations && configExists && !config.includes('i18n:')) {
        config = await addI18nConfigToLayer(configPath, config)
        needsUpdate = true
        console.log(`↻ Adding i18n config to ${layer} layer nuxt.config.ts`)
      }

      if (needsUpdate) {
        await fsp.writeFile(configPath, config)
        console.log(`✓ ${configExists ? 'Updated' : 'Created'} ${layer} layer root nuxt.config.ts`)
      } else {
        console.log(`✓ ${layer} layer root config already properly configured`)
      }
    }
  } catch (error) {
    console.error(`! Could not update ${layer} layer root nuxt.config.ts:`, error.message)
    console.log(`  Please manually add './collections/${cases.plural}' to the extends array`)
  }
}

// Setup i18n folder structure and locale files for a layer
async function setupLayerI18n(layer, collectionName) {
  const layerPath = path.resolve('layers', layer)
  const i18nPath = path.join(layerPath, 'i18n', 'locales')
  const cases = toCase(collectionName)

  try {
    // Create i18n/locales directory
    await fsp.mkdir(i18nPath, { recursive: true })

    // Generate locale files with collection translations template
    const locales = ['en', 'nl', 'fr']

    for (const locale of locales) {
      const localePath = path.join(i18nPath, `${locale}.json`)

      // Check if file exists
      let content
      try {
        await fsp.access(localePath)
        // File exists, merge in new collection keys
        const existing = JSON.parse(await fsp.readFile(localePath, 'utf-8'))
        if (!existing[layer]) existing[layer] = { collections: {} }
        if (!existing[layer].collections) existing[layer].collections = {}
        if (!existing[layer].collections[cases.plural]) {
          existing[layer].collections[cases.plural] = { title: cases.pascalCasePlural }
        }
        content = existing
        await fsp.writeFile(localePath, JSON.stringify(content, null, 2))
        console.log(`  ✓ Updated ${locale}.json with ${cases.plural} translations`)
      } catch {
        // Create new file with initial structure
        content = {
          [layer]: {
            collections: {
              [cases.plural]: { title: cases.pascalCasePlural }
            }
          }
        }
        await fsp.writeFile(localePath, JSON.stringify(content, null, 2))
        console.log(`  ✓ Created ${locale}.json with ${cases.plural} translations`)
      }
    }

    console.log(`✓ Created i18n locale files in layers/${layer}/i18n/locales/`)
    return true
  } catch (error) {
    console.error(`! Could not setup i18n for layer ${layer}:`, error.message)
    return false
  }
}

// Add i18n config block to an existing nuxt.config.ts
async function addI18nConfigToLayer(configPath, config) {
  // Check if i18n config already exists
  if (config.includes('i18n:')) {
    return config // Already has i18n config
  }

  // Find the closing of defineNuxtConfig and add i18n before it
  const i18nConfig = `
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'nl', file: 'nl.json' },
      { code: 'fr', file: 'fr.json' }
    ],
    langDir: './locales'
  }`

  // Find the last closing brace before the final })
  // Strategy: Add after extends array
  const extendsMatch = config.match(/extends:\s*\[[\s\S]*?\]/m)
  if (extendsMatch) {
    const insertPos = config.indexOf(extendsMatch[0]) + extendsMatch[0].length
    // Check if there's a comma after extends
    const afterExtends = config.slice(insertPos)
    if (afterExtends.trim().startsWith(',')) {
      // Already has comma, insert i18n after the comma
      const commaPos = insertPos + afterExtends.indexOf(',') + 1
      config = config.slice(0, commaPos) + i18nConfig + ',' + config.slice(commaPos)
    } else {
      // No comma, add one
      config = config.slice(0, insertPos) + ',' + i18nConfig + config.slice(insertPos)
    }
  }

  return config
}

async function writeScaffold({ layer, collection, fields, dialect, autoRelations, dryRun, noDb, force = false, noTranslations = false, useTeamUtility = false, config = null, collectionConfig = null, hierarchy: hierarchyFlag = false }) {
  const cases = toCase(collection)
  const base = path.resolve('layers', layer, 'collections', cases.plural)

  // Detect hierarchy configuration from collection config or CLI flag
  const hierarchy = collectionConfig?.hierarchy === true || hierarchyFlag === true ? {
    enabled: true,
    parentField: 'parentId',
    orderField: 'order',
    pathField: 'path',
    depthField: 'depth'
  } : (typeof collectionConfig?.hierarchy === 'object' ? {
    enabled: true,
    parentField: collectionConfig.hierarchy.parentField || 'parentId',
    orderField: collectionConfig.hierarchy.orderField || 'order',
    pathField: collectionConfig.hierarchy.pathField || 'path',
    depthField: collectionConfig.hierarchy.depthField || 'depth'
  } : { enabled: false })

  // Detect sortable configuration (simpler than hierarchy, just needs order field for drag-and-drop)
  const sortable = collectionConfig?.sortable === true ? {
    enabled: true,
    orderField: collectionConfig.orderField || 'order'
  } : (typeof collectionConfig?.sortable === 'object' ? {
    enabled: true,
    orderField: collectionConfig.sortable.orderField || 'order'
  } : { enabled: false })

  // Handle translation configuration
  if (!config && !noTranslations) {
    // CLI mode without config: Create default translation config
    // Auto-detect translatable fields based on common patterns
    const translatableFieldNames = ['name', 'title', 'description', 'label',
                                    'placeholder', 'helpText', 'content', 'message',
                                    'remarkPrompt', 'terms', 'conditions', 'notes']
    const translatableFields = fields
      .filter(f => translatableFieldNames.includes(f.name) &&
                   (f.type === 'string' || f.type === 'text'))
      .map(f => f.name)

    if (translatableFields.length > 0) {
      config = {
        translations: {
          collections: {
            [cases.plural]: translatableFields
          }
        }
      }
      console.log(`↻ Auto-detected translatable fields: ${translatableFields.join(', ')}`)
    }
  } else if (noTranslations && config) {
    // Override config to disable translations if flag is set
    config = {
      ...config,
      translations: { collections: {} }  // Clear all translation configurations
    }
  }

  // Check for required modules/dependencies
  console.log('↻ Checking for required dependencies...')
  const dependencies = await detectRequiredDependencies({
    ...config,
    noTranslations
  })

  if (dependencies.missing.length > 0) {
    const shouldContinue = displayMissingDependencies(dependencies)
    if (!shouldContinue && !force) {
      console.error('⚠️  Aborting: Missing required dependencies')
      console.error('   Use --force to generate anyway (may result in broken code)')
      process.exit(1)
    }
    if (force) {
      console.warn('⚠️  Continuing with --force despite missing dependencies')
    }
  } else {
    console.log('✓ All required dependencies found')
    // Ensure layers are extended in nuxt.config
    await ensureLayersExtended(dependencies.layers)
  }

  // Prepare data for all generators
  // Convert layer name to PascalCase (handle hyphens and underscores)
  const layerPascalCase = layer
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  // Convert layer name to camelCase for collection keys
  const layerCamelCase = layer
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const data = {
    ...cases,
    originalCollectionName: collection,  // Preserve original collection name before toCase processing
    layer,
    layerPascalCase,
    fields,
    fieldsSchema: (() => {
      // Get list of translatable field names for this collection
      const translatableFieldNames = config?.translations?.collections?.[cases.plural] || []

      // Generate schema for non-translatable fields
      const regularFieldsSchema = fields
        .filter(f => f.name !== 'id' && !translatableFieldNames.includes(f.name))
        .map(f => {
          // Check if this is a dependent field (should be treated as array)
          const isDependentField = f.meta?.dependsOn || f.meta?.displayAs === 'slotButtonGroup'

          // Override Zod schema for dependent fields to use array
          const baseZod = isDependentField ? 'z.array(z.string())' : f.zod

          if (f.meta?.required) {
            // Handle different types appropriately for required fields
            if (isDependentField) {
              // Dependent fields use array and need non-empty validation
              return `${f.name}: ${baseZod}.min(1, '${f.name} is required')`
            } else if (f.type === 'date') {
              // Dates use required_error parameter, not .min()
              return `${f.name}: z.date({ required_error: '${f.name} is required' })`
            } else if (f.type === 'string' || f.type === 'text') {
              // Strings/text can use .min(1) to ensure non-empty
              return `${f.name}: ${baseZod}.min(1, '${f.name} is required')`
            } else if (f.type === 'number' || f.type === 'decimal') {
              // Numbers are required but don't enforce a minimum value
              return `${f.name}: ${baseZod}`
            } else if (f.type === 'boolean') {
              // Booleans are just required (true or false)
              return `${f.name}: ${baseZod}`
            } else if (f.type === 'json') {
              // JSON objects are required
              return `${f.name}: ${baseZod}`
            } else if (f.type === 'repeater') {
              // Repeater arrays are required
              return `${f.name}: ${baseZod}`
            } else {
              // Default: just use the base zod validator
              return `${f.name}: ${baseZod}`
            }
          } else {
            // Optional fields
            return `${f.name}: ${baseZod}.optional()`
          }
        })

      // Generate schema for translatable fields (make them optional at root)
      const translatableFieldsSchema = fields
        .filter(f => translatableFieldNames.includes(f.name))
        .map(f => `${f.name}: ${f.zod}.optional()`)

      // Combine all field schemas
      let allFieldsSchema = [...regularFieldsSchema, ...translatableFieldsSchema].join(',\n  ')

      // Add hierarchy field to schema if enabled
      if (hierarchy?.enabled) {
        const hierarchySchemaField = `parentId: z.string().nullable().optional()`
        allFieldsSchema = allFieldsSchema ? `${allFieldsSchema},\n  ${hierarchySchemaField}` : hierarchySchemaField
      }

      // Add translations validation if there are translatable fields
      if (translatableFieldNames.length > 0) {
        const translatableFields = fields.filter(f => translatableFieldNames.includes(f.name))
        const requiredTranslatableFields = translatableFields.filter(f => f.meta?.required)

        const translationsFieldSchema = translatableFields.map(f => {
          if (f.meta?.required) {
            return `      ${f.name}: z.string().min(1, '${f.name.charAt(0).toUpperCase() + f.name.slice(1)} is required')`
          } else {
            return `      ${f.name}: z.string().optional()`
          }
        }).join(',\n')

        const requiredFieldsCheck = requiredTranslatableFields.length > 0
          ? `.refine(
    (translations) => translations.en && ${requiredTranslatableFields.map(f => `translations.en.${f.name}`).join(' && ')},
    { message: 'English translations for ${requiredTranslatableFields.map(f => f.name).join(', ')} are required' }
  )`
          : ''

        return `${allFieldsSchema},\n  translations: z.record(
    z.object({
${translationsFieldSchema}
    })
  )${requiredFieldsCheck}`
      }

      return allFieldsSchema
    })(),
    fieldsDefault: (() => {
      let fieldDefaults = fields.filter(f => f.name !== 'id').map(f => {
        // Check if this is a dependent field (should default to null, not empty string)
        const isDependentField = f.meta?.dependsOn || f.meta?.displayAs === 'slotButtonGroup'
        if (isDependentField) {
          return `${f.name}: null`
        }
        return `${f.name}: ${f.default}`
      }).join(',\n    ')

      // Add hierarchy field default if enabled
      if (hierarchy?.enabled) {
        fieldDefaults = fieldDefaults ? `${fieldDefaults},\n    parentId: null` : 'parentId: null'
      }

      const hasTranslations = config?.translations?.collections?.[cases.plural]?.length > 0
      return hasTranslations ? `${fieldDefaults},\n    translations: {}` : fieldDefaults
    })(),
    fieldsColumns: (() => {
      const baseColumns = fields.map(f =>
        `{ accessorKey: '${f.name}', header: '${f.name.charAt(0).toUpperCase() + f.name.slice(1)}' }`
      ).join(',\n  ')

      // Check if translations are enabled for this collection
      const hasTranslations = config?.translations?.collections?.[cases.plural]?.length > 0
      const translationsColumn = hasTranslations
        ? ',\n  { accessorKey: \'translations\', header: \'Translations\' }'
        : ''

      return baseColumns + translationsColumn
    })(),
    fieldsTypes: fields.filter(f => f.name !== 'id').map(f => {
      // Check if this is a dependent field (should be string[] | null)
      const isDependentField = f.meta?.dependsOn || f.meta?.displayAs === 'slotButtonGroup'
      const tsType = isDependentField ? 'string[] | null' : f.tsType
      return `${f.name}${f.meta?.required ? '' : '?'}: ${tsType}`
    }).join('\n  '),
    hierarchy, // Pass hierarchy config to generators
    sortable   // Pass sortable config to generators
  }
  
  if (dryRun) {
    const apiPath = `${layer}-${cases.plural}`
    console.log('DRY RUN - Would generate:')
    if (hierarchy.enabled) {
      console.log(`\n🌳 HIERARCHY ENABLED - Additional files will be generated:`)
      console.log(`   • Database fields: parentId, path, depth, order`)
      console.log(`   • Tree queries: getTreeData(), updatePosition(), reorderSiblings()`)
      console.log(`   • API endpoints: [id]/move.patch.ts, reorder.patch.ts`)
      console.log(`   • Form: Parent picker component\n`)
    }
    console.log(`• ${base}/app/components/Form.vue`)
    console.log(`• ${base}/app/components/List.vue`)

    // Show repeater components
    const repeaterFields = fields.filter(f => f.type === 'repeater')
    const repeaterComponents = new Set()
    for (const field of repeaterFields) {
      const componentName = field.meta?.repeaterComponent
      if (componentName && !repeaterComponents.has(componentName)) {
        repeaterComponents.add(componentName)
        console.log(`• ${base}/app/components/${componentName}.vue [PLACEHOLDER]`)
      }
    }

    console.log(`• ${base}/app/composables/use${layerPascalCase}${cases.pascalCasePlural}.ts`)
    console.log(`• ${base}/server/api/teams/[id]/${apiPath}/index.get.ts`)
    console.log(`• ${base}/server/api/teams/[id]/${apiPath}/index.post.ts`)
    console.log(`• ${base}/server/api/teams/[id]/${apiPath}/[${cases.singular}Id].patch.ts`)
    console.log(`• ${base}/server/api/teams/[id]/${apiPath}/[${cases.singular}Id].delete.ts`)
    if (hierarchy.enabled) {
      console.log(`• ${base}/server/api/teams/[id]/${apiPath}/[${cases.singular}Id]/move.patch.ts`)
      console.log(`• ${base}/server/api/teams/[id]/${apiPath}/reorder.patch.ts`)
    }
    console.log(`• ${base}/server/database/queries.ts`)
    console.log(`• ${base}/server/database/schema.ts`)
    console.log(`• ${base}/types.ts`)
    console.log(`• ${base}/nuxt.config.ts`)
    console.log(`• layers/${layer}/nuxt.config.ts (layer root config)`)
    console.log(`• nuxt.config.ts (root config - add layer to extends)`)
    if (!noDb) {
      console.log(`• Would update server/database/schema/index.ts`)
      console.log(`• Would generate database migration`)
    }

    if (repeaterComponents.size > 0) {
      console.log(`\n• Would generate ${repeaterComponents.size} placeholder repeater component(s):`)
      repeaterComponents.forEach(name => {
        console.log(`   - ${name}.vue`)
      })
    }
    return
  }
  
  // Create directories
  // Use layer-prefixed API path
  // For system collections, use simplified naming without layer prefix
  let apiPath
  if (layer.startsWith('crouton-')) {
    // System collection: use crouton-<collection_name> format
    // e.g., crouton-events + collectionEvents -> crouton-collection-events
    apiPath = toSnakeCase(`crouton_${collection}`).replace(/_/g, '-')
  } else {
    apiPath = `${layer}-${cases.plural}`
  }
  const dirs = [
    path.join(base, 'app', 'components'),
    path.join(base, 'app', 'composables'),
    path.join(base, 'server', 'api', 'teams', '[id]', apiPath),
    path.join(base, 'server', 'database')
  ]

  // Add subdirectory for move endpoint when hierarchy is enabled
  if (hierarchy.enabled) {
    dirs.push(path.join(base, 'server', 'api', 'teams', '[id]', apiPath, `[${cases.singular}Id]`))
  }
  
  for (const dir of dirs) {
    await fsp.mkdir(dir, { recursive: true })
  }
  
  console.log('✓ Directory structure created')
  
  // Generate all files using modules
  // Use simplified endpoints if team utility flag is set
  const getEndpointGen = useTeamUtility ? generateGetEndpointSimplified : generateGetEndpoint
  const postEndpointGen = useTeamUtility ? generatePostEndpointSimplified : generatePostEndpoint
  const patchEndpointGen = useTeamUtility ? generatePatchEndpointSimplified : generatePatchEndpoint
  const deleteEndpointGen = useTeamUtility ? generateDeleteEndpointSimplified : generateDeleteEndpoint

  const files = [
    {
      path: path.join(base, 'app', 'components', 'Form.vue'),
      content: generateFormComponent(data, config)
    },
    {
      path: path.join(base, 'app', 'components', 'List.vue'),
      content: generateListComponent(data, config)
    },
    {
      path: path.join(base, 'app', 'composables', `use${layerPascalCase}${cases.pascalCasePlural}.ts`),
      content: generateComposable(data, config)
    },
    {
      path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, 'index.get.ts'),
      content: getEndpointGen(data, config)
    },
    {
      path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, 'index.post.ts'),
      content: postEndpointGen(data, config)
    },
    {
      path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, `[${cases.singular}Id].patch.ts`),
      content: patchEndpointGen(data, config)
    },
    {
      path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, `[${cases.singular}Id].delete.ts`),
      content: deleteEndpointGen(data, config)
    },
    {
      path: path.join(base, 'server', 'database', 'queries.ts'),
      content: generateQueries(data, config)
    },
    { 
      path: path.join(base, 'server', 'database', 'schema.ts'),
      content: generateSchema(data, dialect, config)
    },
    {
      path: path.join(base, 'types.ts'),
      content: generateTypes(data, config)
    },
    {
      path: path.join(base, 'nuxt.config.ts'),
      content: generateNuxtConfig(data)
    },
    {
      path: path.join(base, 'README.md'),
      content: generateCollectionReadme(data, config)
    }
  ]

  // Add hierarchy endpoint files when hierarchy is enabled
  if (hierarchy.enabled) {
    files.push(
      {
        path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, `[${cases.singular}Id]`, 'move.patch.ts'),
        content: generateMoveEndpoint(data, config)
      },
      {
        path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, 'reorder.patch.ts'),
        content: generateReorderEndpoint(data, config)
      }
    )
  } else if (sortable.enabled) {
    // Add reorder endpoint only for sortable collections (no move endpoint needed for simple sorting)
    files.push({
      path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, 'reorder.patch.ts'),
      content: generateReorderEndpoint(data, config)
    })
  }

  // Detect repeater fields and generate field components
  // These are the source fields that other collections will depend on
  const repeaterFields = fields.filter(f => f.type === 'repeater')
  const generatedFieldComponents = new Set()

  for (const field of repeaterFields) {
    if (!generatedFieldComponents.has(field.name)) {
      generatedFieldComponents.add(field.name)

      // Generate folder name in PascalCase (e.g., 'slots' -> 'Slot')
      const fieldCases = toCase(field.name)
      const fieldFolderName = fieldCases.pascalCase

      // Create Field folder directory
      const fieldFolderPath = path.join(base, 'app', 'components', fieldFolderName)
      await fsp.mkdir(fieldFolderPath, { recursive: true })

      // Generate all three field components
      const { input, select, cardMini } = generateFieldComponents(field.name, data)

      files.push({
        path: path.join(fieldFolderPath, 'Input.vue'),
        content: input
      })
      files.push({
        path: path.join(fieldFolderPath, 'Select.vue'),
        content: select
      })
      files.push({
        path: path.join(fieldFolderPath, 'CardMini.vue'),
        content: cardMini
      })
    }
  }

  // Write all files
  for (const file of files) {
    await fsp.writeFile(file.path, file.content, 'utf8')
    console.log(`  ✓ ${path.relative(base, file.path)}`)
  }

  // Note: team-auth utility is now provided by @friendlyinternet/nuxt-crouton package
  // No need to generate it per-layer

  // Check if we're using translations
  const hasTranslations = config?.translations?.collections?.[cases.plural]?.length > 0

  // Update layer root nuxt.config.ts to extend the new collection (and translations layer if needed)
  await updateLayerRootConfig(layer, collection, hasTranslations)

  // Setup i18n folder structure and locale files if translations are enabled
  if (hasTranslations) {
    await setupLayerI18n(layer, collection)
  }

  // Update root nuxt.config.ts to extend the layer
  await updateRootNuxtConfig(layer)
  
  // Create database table if requested
  if (!noDb) {
    await createDatabaseTable({ name: collection, layer, fields, force })

    // If translations are enabled, export the i18n schema
    if (hasTranslations) {
      console.log(`↻ Setting up translations support...`)
      await exportI18nSchema(force)
    }
  }

  // Update collection registry
  const collectionKey = `${layerCamelCase}${cases.pascalCasePlural}`
  const configExportName = `${layerPascalCase.toLowerCase()}${cases.pascalCasePlural}Config`
  await updateRegistry({
    layer,
    collection: cases.plural,
    collectionKey,
    configExportName,
    layerPascalCase,
    pascalCasePlural: cases.pascalCasePlural
  })

  console.log(`\n✓ Successfully generated collection '${cases.plural}' in layer '${layer}'`)
}

// Validate config before starting generation
async function validateConfig(config) {
  const errors = []
  const warnings = []

  console.log('\n' + '═'.repeat(60))
  console.log('  VALIDATION')
  console.log('═'.repeat(60) + '\n')

  // Check if config file exists and is valid
  if (!config) {
    errors.push('Configuration file is empty or invalid')
    return { valid: false, errors, warnings }
  }

  // Validate schema files exist
  if (config.collections && Array.isArray(config.collections)) {
    // Enhanced format with multiple schemas
    for (const col of config.collections) {
      if (!col.fieldsFile) {
        errors.push(`Collection '${col.name}' is missing fieldsFile path`)
        continue
      }

      // Resolve path relative to config file directory if _configDir is set
      const schemaPath = config._configDir && !path.isAbsolute(col.fieldsFile)
        ? path.resolve(config._configDir, col.fieldsFile)
        : path.resolve(col.fieldsFile)
      try {
        await fsp.access(schemaPath)
        console.log(`  ✓ Schema: ${col.fieldsFile}`)
      } catch {
        errors.push(`❌ Schema file not found for collection '${col.name}': ${col.fieldsFile}`)
      }
    }
  } else if (config.schemaPath) {
    // Simple format with single schema
    const schemaPath = path.resolve(config.schemaPath)
    try {
      const stats = await fsp.stat(schemaPath)
      if (stats.isDirectory()) {
        errors.push(
          `schemaPath '${config.schemaPath}' is a directory, not a file.\n` +
          `   When using targets[], use the enhanced format with a collections[] array\n` +
          `   where each collection specifies its own fieldsFile:\n\n` +
          `   collections: [\n` +
          `     { name: 'products', fieldsFile: '${config.schemaPath}/products.json' },\n` +
          `     { name: 'categories', fieldsFile: '${config.schemaPath}/categories.json' },\n` +
          `   ],\n` +
          `   targets: [...]\n`
        )
      } else {
        console.log(`✓ Schema file found: ${config.schemaPath}`)
      }
    } catch {
      errors.push(`Schema file not found: ${config.schemaPath}`)
    }
  } else {
    errors.push('No schema configuration found (need either schemaPath or collections array)')
  }

  // Validate targets
  if (!config.targets || !Array.isArray(config.targets) || config.targets.length === 0) {
    errors.push('No targets specified in configuration')
  } else {
    let totalCollections = 0
    for (const target of config.targets) {
      if (!target.layer) {
        errors.push('Target missing layer name')
      }
      if (!target.collections || !Array.isArray(target.collections) || target.collections.length === 0) {
        errors.push(`Target layer '${target.layer}' has no collections`)
      } else {
        totalCollections += target.collections.length
      }
    }
    console.log(`  ✓ Found ${config.targets.length} layers, ${totalCollections} collections`)
  }

  // Validate dialect
  if (config.dialect && !['pg', 'sqlite'].includes(config.dialect)) {
    warnings.push(`Unknown dialect '${config.dialect}', defaulting to 'pg'`)
  }

  // Check if collections in targets match defined collections (for enhanced format)
  if (config.collections && config.targets) {
    const definedCollections = new Set(config.collections.map(c => c.name))
    const usedCollections = new Set()

    for (const target of config.targets) {
      for (const colName of target.collections) {
        usedCollections.add(colName)
        if (!definedCollections.has(colName)) {
          errors.push(`Collection '${colName}' in layer '${target.layer}' is not defined in collections array`)
        }
      }
    }

    // Check for unused defined collections
    for (const colName of definedCollections) {
      if (!usedCollections.has(colName)) {
        warnings.push(`Collection '${colName}' is defined but not used in any target`)
      }
    }
  }

  // Check for write permissions in current directory
  try {
    await fsp.access(process.cwd(), fsp.constants.W_OK)
    console.log(`  ✓ Write permissions verified`)
  } catch {
    errors.push(`No write permissions in current directory: ${process.cwd()}`)
  }

  // Check if layers directory exists or can be created
  const layersPath = path.resolve('layers')
  try {
    await fsp.access(layersPath)
    console.log(`  ✓ Layers directory exists`)
  } catch {
    // Try to check parent directory permissions
    try {
      await fsp.access(process.cwd(), fsp.constants.W_OK)
      console.log(`  ✓ Can create layers directory`)
    } catch {
      errors.push('Cannot create layers directory - check permissions')
    }
  }

  // Check for required dependencies (unless force flag is set)
  if (!config.flags?.force) {
    const dependencies = await detectRequiredDependencies(config)

    if (dependencies.missing.length > 0) {
      warnings.push(`Missing dependencies detected. Run 'crouton-generate install' or use --force to skip`)
      console.log('\n⚠️  Missing dependencies:')
      dependencies.missing.forEach(dep => {
        console.log(`  • ${dep.name} - ${dep.reason}`)
      })
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60))

  if (errors.length > 0) {
    console.log('\n❌ Validation failed with errors:\n')
    errors.forEach(err => console.log(`  • ${err}`))
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:\n')
    warnings.forEach(warn => console.log(`  • ${warn}`))
  }

  if (errors.length === 0) {
    console.log('\n✓ Configuration validated successfully!')

    // Show what will be generated
    console.log('\n' + '═'.repeat(60))
    console.log('  GENERATION PLAN')
    console.log('═'.repeat(60))
    for (const target of config.targets) {
      console.log(`\n  ${target.layer}`)
      for (const col of target.collections) {
        console.log(`    • ${col}`)
      }
    }

    if (config.flags?.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No files will be created')
    }
  }

  console.log('\n' + '─'.repeat(60) + '\n')

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

async function main() {
  try {
    // Check if being called with config file
    if (process.argv[2] === '--config') {
      // Load config mode
      const configPath = path.resolve(process.argv[3] || './migrate.config.js')

      // First check if config file exists
      try {
        await fsp.access(configPath)
      } catch {
        console.error(`\n❌ Config file not found: ${configPath}\n`)
        process.exit(1)
      }

      // Convert path to file URL for proper ES module import
      const { pathToFileURL } = await import('url')
      const configUrl = pathToFileURL(configPath).href
      const config = (await import(configUrl)).default

      // Store the config directory for resolving relative paths
      config._configDir = path.dirname(configPath)

      // Parse --only flag for single-collection generation
      const onlyArg = process.argv.find(arg => arg.startsWith('--only='))
      const onlyCollection = onlyArg ? onlyArg.split('=')[1] : null
      if (onlyCollection) {
        console.log(`\n📌 Generating only: ${onlyCollection}\n`)
      }
      config._onlyCollection = onlyCollection

      // Validate configuration before proceeding
      const validation = await validateConfig(config)

      if (!validation.valid) {
        console.error('\n⛔ Cannot proceed with generation due to validation errors\n')
        process.exit(1)
      }

      // Detect external collection references (e.g., :users, :teams)
      console.log(`\n${'─'.repeat(60)}`)
      console.log(`Detecting external collection references...`)
      console.log(`${'─'.repeat(60)}\n`)

      // For enhanced config format, we need to scan all schema files
      // For simple config format, use the single schemaPath
      let schemaPathToScan
      if (config.collections && Array.isArray(config.collections)) {
        // Enhanced format: Get directory from first collection's fieldsFile
        const firstFieldsFile = config.collections[0]?.fieldsFile
        if (firstFieldsFile) {
          const resolvedPath = config._configDir && !path.isAbsolute(firstFieldsFile)
            ? path.resolve(config._configDir, firstFieldsFile)
            : path.resolve(firstFieldsFile)
          schemaPathToScan = path.dirname(resolvedPath)
        } else {
          schemaPathToScan = '.'
        }
      } else {
        // Simple format: use schemaPath
        schemaPathToScan = config.schemaPath || '.'
      }

      const externalRefs = await detectExternalReferences(schemaPathToScan)

      if (externalRefs.size > 0) {
        console.log(`✓ Found ${externalRefs.size} external collection(s):`)
        console.log(formatExternalReferences(externalRefs))
        console.log()

        // Process each external reference
        for (const [collectionName, usingCollections] of externalRefs) {
          const recommendations = getConnectorRecommendations(collectionName)

          // Check if connector is configured
          const connectorConfig = config.connectors?.[collectionName]

          if (connectorConfig && config.flags?.autoConnectors) {
            // Config-based mode: Auto-install without prompting
            console.log(`\n↻ Setting up connector for '${collectionName}' (${connectorConfig.type})...`)

            const projectRoot = process.cwd()

            // Install package if needed
            if (connectorConfig.autoInstall) {
              await installConnectorPackage(projectRoot)
            }

            // Setup connector via layer (no file copying)
            console.log(`📦 Setting up ${collectionName} connector from package...`)

            // Add connector layer to nuxt.config
            await addConnectorToNuxtConfig(projectRoot)

            // Update app.config to import from package
            await updateAppConfigWithPackageImport(projectRoot, collectionName, connectorConfig.type)

            console.log(`✓ ${collectionName} connector configured via layer`)

            console.log(`✓ Connector '${collectionName}' setup complete`)
          } else if (!config.flags?.autoConnectors) {
            // Interactive mode: Prompt user
            await setupConnectorInteractive(process.cwd(), collectionName, recommendations)
          } else {
            console.log(`⊘ No connector configured for '${collectionName}' - skipping`)
            console.log(`  ℹ  You'll need to set this up manually or configure in crouton.config.js`)
          }
        }

        console.log(`\n${'─'.repeat(60)}\n`)
      } else {
        console.log(`✓ No external references detected\n`)
      }

      // Handle both config formats
      if (config.collections && config.targets) {
        // Enhanced config format with collections array
        if (!config.targets || !config.collections) {
          console.error('Error: Invalid config file - missing targets or collections')
          process.exit(1)
        }
        
        // Create a map of collection names to their full config (including fieldsFile, hierarchy, etc.)
        const collectionConfigMap = {}
        for (const col of config.collections) {
          collectionConfigMap[col.name] = col
        }

        // Track all collections for batch db:generate
        const allCollections = []
        let hasAnyTranslations = false

        // Process each target
        for (const target of config.targets) {
          for (const collectionName of target.collections) {
            // Skip if --only flag is set and this isn't the target collection
            if (config._onlyCollection && collectionName !== config._onlyCollection) {
              continue
            }

            const collectionConfig = collectionConfigMap[collectionName]
            if (!collectionConfig?.fieldsFile) {
              console.error(`Error: No fields file found for collection '${collectionName}'`)
              continue
            }

            console.log(`\n${'─'.repeat(60)}`)
            console.log(`Generating ${target.layer}/${collectionName}`)
            console.log(`${'─'.repeat(60)}`)
            console.log(`Schema: ${collectionConfig.fieldsFile}`)
            if (collectionConfig.hierarchy) {
              console.log(`Hierarchy: enabled`)
            }

            // Resolve fieldsFile path relative to config directory if needed
            const resolvedFieldsFile = config._configDir && !path.isAbsolute(collectionConfig.fieldsFile)
              ? path.resolve(config._configDir, collectionConfig.fieldsFile)
              : collectionConfig.fieldsFile
            const fields = await loadFields(resolvedFieldsFile)

            // Check if this collection has translations
            const hasTranslations = config?.translations?.collections?.[collectionName]?.length > 0
            if (hasTranslations) {
              hasAnyTranslations = true
            }

            // Generate files but skip database creation (we'll do it in batch at the end)
            await writeScaffold({
              layer: target.layer,
              collection: collectionName,
              fields,
              dialect: config.dialect || 'pg',
              autoRelations: config.flags?.autoRelations || false,
              dryRun: config.flags?.dryRun || false,
              noDb: true, // Skip individual db:generate
              force: config.flags?.force || false,
              noTranslations: config.flags?.noTranslations || false,
              useTeamUtility: config.flags?.useTeamUtility || false,
              config: config,
              collectionConfig: collectionConfig // Pass individual collection config for hierarchy detection
            })

            allCollections.push({ name: collectionName, layer: target.layer, fields })
          }
        }

        // Update schema index for all collections and run migration once (unless disabled)
        if (!config.flags?.noDb && !config.flags?.dryRun && allCollections.length > 0) {
          console.log(`\n${'═'.repeat(60)}`)
          console.log(`  DATABASE SETUP`)
          console.log(`${'═'.repeat(60)}\n`)
          console.log(`Updating schema index for ${allCollections.length} collections...`)

          // Update schema index for each collection
          for (const col of allCollections) {
            const schemaUpdated = await updateSchemaIndex(col.name, col.layer, config.flags?.force || false)
            if (!schemaUpdated) {
              console.error(`  ✗ Failed to update schema index for ${col.name}`)
            }
          }

          // Export i18n schema if any collection uses translations
          if (hasAnyTranslations) {
            console.log(`\n↻ Setting up translations support...`)
            await exportI18nSchema(config.flags?.force || false)
          }

          // Run database migration once for all collections
          console.log(`\nRunning database migration...`)
          console.log(`Command: pnpm db:generate (30s timeout)`)

          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Command timed out after 30 seconds')), 30000)
            })

            const { stdout, stderr } = await Promise.race([
              execAsync('pnpm db:generate'),
              timeoutPromise
            ])

            if (stderr && !stderr.includes('Warning')) {
              console.error(`⚠ Warnings:`, stderr)
            }
            console.log(`\n✓ Database migration generated successfully`)
          } catch (execError) {
            if (execError.message.includes('timed out')) {
              console.error(`\n✗ Database migration timed out after 30 seconds`)
              console.error(`  Check server/database/schema/index.ts for conflicts`)
            } else {
              console.error(`\n✗ Failed to run database migration:`, execError.message)
            }
            console.log(`\nManual command: pnpm db:generate && pnpm db:push\n`)
          }
        }

        // Setup CSS @source directive for Tailwind
        console.log(`\n${'═'.repeat(60)}`)
        console.log(`  TAILWIND CSS SETUP`)
        console.log(`${'═'.repeat(60)}\n`)

        const cssResult = await setupCroutonCssSource(process.cwd())

        if (cssResult.success) {
          if (cssResult.action === 'created') {
            console.log(`✓ Created CSS file with @source directive`)
          } else if (cssResult.action === 'updated') {
            console.log(`✓ Added @source directive to existing CSS`)
          } else {
            console.log(`✓ CSS @source directive already configured`)
          }
        } else {
          console.log(`\n⚠️  Could not automatically setup CSS @source directive`)
          displayManualCssSetupInstructions()
        }

        console.log(`\n${'═'.repeat(60)}`)
        console.log(`  ALL DONE!`)
        console.log(`${'═'.repeat(60)}\n`)
        console.log(`Next step: Restart your Nuxt dev server\n`)
      } else if (config.targets && config.schemaPath) {
        // Original simple config format
        const fields = await loadFields(config.schemaPath)

        // Track all collections for batch db:generate
        const allCollections = []
        let hasAnyTranslations = false

        // Process each target
        for (const target of config.targets) {
          for (const collection of target.collections) {
            // Check if this collection has translations
            const hasTranslations = config?.translations?.collections?.[collection]?.length > 0
            if (hasTranslations) {
              hasAnyTranslations = true
            }
            console.log(`\nGenerating collection '${collection}' in layer '${target.layer}'...`)
            await writeScaffold({
              layer: target.layer,
              collection,
              fields,
              dialect: config.dialect || 'pg',
              autoRelations: config.flags?.autoRelations || false,
              dryRun: config.flags?.dryRun || false,
              noDb: true, // Skip individual db:generate
              force: config.flags?.force || false,
              noTranslations: config.flags?.noTranslations || false,
              useTeamUtility: config.flags?.useTeamUtility || false,
              config: config
            })

            allCollections.push({ name: collection, layer: target.layer, fields })
          }
        }

        // Update schema index for all collections and run migration once (unless disabled)
        if (!config.flags?.noDb && !config.flags?.dryRun && allCollections.length > 0) {
          console.log(`\n${'═'.repeat(60)}`)
          console.log(`  DATABASE SETUP`)
          console.log(`${'═'.repeat(60)}\n`)
          console.log(`Updating schema index for ${allCollections.length} collections...`)

          // Update schema index for each collection
          for (const col of allCollections) {
            const schemaUpdated = await updateSchemaIndex(col.name, col.layer, config.flags?.force || false)
            if (!schemaUpdated) {
              console.error(`  ✗ Failed to update schema index for ${col.name}`)
            }
          }

          // Export i18n schema if any collection uses translations
          if (hasAnyTranslations) {
            console.log(`\n↻ Setting up translations support...`)
            await exportI18nSchema(config.flags?.force || false)
          }

          // Run database migration once for all collections
          console.log(`\nRunning database migration...`)
          console.log(`Command: pnpm db:generate (30s timeout)`)

          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Command timed out after 30 seconds')), 30000)
            })

            const { stdout, stderr } = await Promise.race([
              execAsync('pnpm db:generate'),
              timeoutPromise
            ])

            if (stderr && !stderr.includes('Warning')) {
              console.error(`⚠ Warnings:`, stderr)
            }
            console.log(`\n✓ Database migration generated successfully`)
          } catch (execError) {
            if (execError.message.includes('timed out')) {
              console.error(`\n✗ Database migration timed out after 30 seconds`)
              console.error(`  Check server/database/schema/index.ts for conflicts`)
            } else {
              console.error(`\n✗ Failed to run database migration:`, execError.message)
            }
            console.log(`\nManual command: pnpm db:generate && pnpm db:push\n`)
          }
        }

        // Setup CSS @source directive for Tailwind
        console.log(`\n${'═'.repeat(60)}`)
        console.log(`  TAILWIND CSS SETUP`)
        console.log(`${'═'.repeat(60)}\n`)

        const cssResult2 = await setupCroutonCssSource(process.cwd())

        if (cssResult2.success) {
          if (cssResult2.action === 'created') {
            console.log(`✓ Created CSS file with @source directive`)
          } else if (cssResult2.action === 'updated') {
            console.log(`✓ Added @source directive to existing CSS`)
          } else {
            console.log(`✓ CSS @source directive already configured`)
          }
        } else {
          console.log(`\n⚠️  Could not automatically setup CSS @source directive`)
          displayManualCssSetupInstructions()
        }

        console.log(`\n${'═'.repeat(60)}`)
        console.log(`  ALL DONE!`)
        console.log(`${'═'.repeat(60)}\n`)
        console.log(`Next step: Restart your Nuxt dev server\n`)
      } else {
        console.error('Error: Invalid config file')
        console.error('Config must have either:')
        console.error('  1. collections[] and targets[] (enhanced format)')
        console.error('  2. schemaPath and targets[] (simple format)')
        process.exit(1)
      }
    } else {
      // Direct CLI mode
      const args = parseArgs()

      // Validate CLI arguments
      console.log('\n📋 Validating CLI arguments...\n')

      // Check schema file exists
      const schemaPath = path.resolve(args.fieldsFile)
      try {
        await fsp.access(schemaPath)
        console.log(`✓ Schema file found: ${args.fieldsFile}`)
      } catch {
        console.error(`\n❌ Schema file not found: ${args.fieldsFile}\n`)
        process.exit(1)
      }

      // Check for write permissions
      try {
        await fsp.access(process.cwd(), fsp.constants.W_OK)
        console.log(`✓ Write permissions verified`)
      } catch {
        console.error(`\n❌ No write permissions in current directory\n`)
        process.exit(1)
      }

      // Check dependencies unless force flag
      if (!args.force) {
        const dependencies = await detectRequiredDependencies()

        if (dependencies.missing.length > 0) {
          console.log('\n⚠️  Missing dependencies detected:')
          displayMissingDependencies(dependencies)

          if (!args.force) {
            console.log('\nUse --force to skip this check or run:')
            console.log('  crouton-generate install\n')
          }
        }
      }

      console.log(`\n📦 Will generate:`)
      console.log(`  Layer: ${args.layer}`)
      console.log(`  Collection: ${args.collection}`)
      console.log(`  Dialect: ${args.dialect}`)

      if (args.dryRun) {
        console.log('\n🔍 DRY RUN MODE - No files will be created')
      }

      console.log('\n' + '─'.repeat(60) + '\n')

      // Load and validate the schema content
      let fields
      try {
        fields = await loadFields(args.fieldsFile)
        console.log(`✓ Loaded ${fields.length} fields from schema`)
      } catch (error) {
        console.error(`\n❌ Error loading schema: ${error.message}\n`)
        process.exit(1)
      }

      // Proceed with generation
      await writeScaffold({ ...args, fields })
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
