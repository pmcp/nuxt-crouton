#!/usr/bin/env node
// generate-collection.next.mjs — Complete collection generator with modular architecture

import fsp from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Import utilities
import { toCase, mapType, typeMapping } from './utils/helpers.mjs'
import { DIALECTS } from './utils/dialects.mjs'
import { detectRequiredDependencies, displayMissingDependencies, ensureLayersExtended } from './utils/module-detector.mjs'

// Import generators
import { generateFormComponent } from './generators/form-component.mjs'
import { generateListComponent } from './generators/list-component.mjs'
import { generateComposable } from './generators/composable.mjs'
import { 
  generateGetEndpoint, 
  generatePostEndpoint, 
  generatePatchEndpoint, 
  generateDeleteEndpoint 
} from './generators/api-endpoints.mjs'
import { generateQueries } from './generators/database-queries.mjs'
import { generateSchema } from './generators/database-schema.mjs'
import { generateTypes } from './generators/types.mjs'
import { generateNuxtConfig } from './generators/nuxt-config.mjs'

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

  if (!layer || !collection) {
    console.log('Usage: node scripts/generate-collection.next.mjs <layer> <collection> [--fields-file <path>] [--dialect=pg|sqlite] [--auto-relations] [--dry-run] [--no-db] [--force] [--no-translations]')
    process.exit(1)
  }

  return { layer, collection, fieldsFile, dialect, autoRelations, dryRun, noDb, force, noTranslations }
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
  return Object.entries(obj).map(([name, meta]) => ({
    name,
    type: mapType(meta?.type),
    meta: meta?.meta || {},
    refTarget: meta?.refTarget,
    zod: typeMapping[mapType(meta?.type)]?.zod || 'z.string()',
    default: typeMapping[mapType(meta?.type)]?.default || "''",
    tsType: typeMapping[mapType(meta?.type)]?.tsType || 'string'
  }))
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
    
show    // Add named export for the new collection schema
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
async function updateRegistry(layer, collection, collectionKey, componentName) {
  const registryPath = path.resolve('app.config.ts')

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
      content = `export default defineAppConfig({
  croutonCollections: {
    // Collections will be added here by the generator
  }
})
`
    }

    // Check if already exists
    if (content.includes(`${collectionKey}:`)) {
      console.log(`⚠️  Collection "${collectionKey}" already in registry`)
      return
    }

    // Add new entry to croutonCollections
    const composableName = `use${componentName}`
    const newEntry = `    ${collectionKey}: () => import('#imports').then(m => m.${composableName}),`

    // Check if croutonCollections exists
    if (!content.includes('croutonCollections')) {
      // Add croutonCollections to existing app.config
      content = content.replace(
        'defineAppConfig({',
        `defineAppConfig({
  croutonCollections: {
${newEntry}
  },`
      )
    } else {
      // Find and update existing croutonCollections
      const croutonRegex = /croutonCollections:\s*{([^}]*)}/
      const match = content.match(croutonRegex)

      if (match) {
        const currentCollections = match[1]

        // Check if it's empty (only has comment or whitespace)
        if (currentCollections.trim().startsWith('//') || currentCollections.trim() === '') {
          // Replace comment with actual entry
          content = content.replace(
            match[0],
            `croutonCollections: {\n${newEntry}\n  }`
          )
        } else {
          // Add to existing collections
          const updatedCollections = currentCollections.trimEnd() + '\n' + newEntry
          content = content.replace(
            match[0],
            `croutonCollections: {${updatedCollections}\n  }`
          )
        }
      }
    }

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

        lines.push(layerPath)
        
        // Add proper indentation and commas
        const formattedLines = lines.map((line, index) => {
          const trimmedLine = line.trim()
          const indentedLine = `    ${trimmedLine}`
          return index < lines.length - 1 ? indentedLine + ',' : indentedLine
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
  ]
})
`
    }
    
    // Find the extends array
    const extendsMatch = config.match(/extends:\s*\[([\s\S]*?)\]/m)
    if (extendsMatch) {
      const currentExtends = extendsMatch[1]
      const newCollection = `'./collections/${cases.plural}'`
      const translationsLayer = `'../../translations'`

      // Parse existing entries
      let lines = currentExtends.split('\n')
        .map(line => line.trim().replace(/,$/, ''))
        .filter(line => line && line !== ',' && !line.startsWith('//'))

      let needsUpdate = false

      // Check if collection needs to be added
      if (!currentExtends.includes(newCollection)) {
        lines.push(newCollection)
        needsUpdate = true
      }

      // Check if translations layer needs to be added (when using translations)
      if (hasTranslations && !currentExtends.includes(translationsLayer) && !currentExtends.includes('translations')) {
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

async function writeScaffold({ layer, collection, fields, dialect, autoRelations, dryRun, noDb, force = false, noTranslations = false, config = null }) {
  const cases = toCase(collection)
  const base = path.resolve('layers', layer, 'collections', cases.plural)

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
    console.log('✅ All required dependencies found')
    // Ensure layers are extended in nuxt.config
    await ensureLayersExtended(dependencies.layers)
  }

  // Prepare data for all generators
  // Convert layer name to PascalCase (handle hyphens and underscores)
  const layerPascalCase = layer
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const data = {
    ...cases,
    layer,
    layerPascalCase,
    fields,
    fieldsSchema: fields.filter(f => f.name !== 'id').map(f =>
      `${f.name}: ${f.zod}${f.meta?.required ? `.min(1, '${f.name} is required')` : '.optional()'}`
    ).join(',\n  '),
    fieldsDefault: fields.filter(f => f.name !== 'id').map(f => `${f.name}: ${f.default}`).join(',\n    '),
    fieldsColumns: fields.map(f => 
      `{ accessorKey: '${f.name}', header: '${f.name.charAt(0).toUpperCase() + f.name.slice(1)}' }`
    ).join(',\n  ').concat(',\n  { accessorKey: \'actions\', header: \'Actions\' }'),
    fieldsTypes: fields.filter(f => f.name !== 'id').map(f => 
      `${f.name}${f.meta?.required ? '' : '?'}: ${f.tsType}`
    ).join('\n  ')
  }
  
  if (dryRun) {
    const apiPath = `${layer}-${cases.plural}`
    console.log('DRY RUN - Would generate:')
    console.log(`• ${base}/app/components/Form.vue`)
    console.log(`• ${base}/app/components/List.vue`)
    console.log(`• ${base}/app/composables/use${layerPascalCase}${cases.pascalCasePlural}.ts`)
    console.log(`• ${base}/server/api/teams/[id]/${apiPath}/index.get.ts`)
    console.log(`• ${base}/server/api/teams/[id]/${apiPath}/index.post.ts`)
    console.log(`• ${base}/server/api/teams/[id]/${apiPath}/[${cases.singular}Id].patch.ts`)
    console.log(`• ${base}/server/api/teams/[id]/${apiPath}/[${cases.singular}Id].delete.ts`)
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
    return
  }
  
  // Create directories
  // Use layer-prefixed API path
  const apiPath = `${layer}-${cases.plural}`
  const dirs = [
    path.join(base, 'app', 'components'),
    path.join(base, 'app', 'composables'),
    path.join(base, 'server', 'api', 'teams', '[id]', apiPath),
    path.join(base, 'server', 'database')
  ]
  
  for (const dir of dirs) {
    await fsp.mkdir(dir, { recursive: true })
  }
  
  console.log('✓ Created directory structure')
  
  // Generate all files using modules
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
      content: generateGetEndpoint(data, config)
    },
    { 
      path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, 'index.post.ts'),
      content: generatePostEndpoint(data, config)
    },
    { 
      path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, `[${cases.singular}Id].patch.ts`),
      content: generatePatchEndpoint(data, config)
    },
    { 
      path: path.join(base, 'server', 'api', 'teams', '[id]', apiPath, `[${cases.singular}Id].delete.ts`),
      content: generateDeleteEndpoint(data, config)
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
      content: generateTypes(data)
    },
    { 
      path: path.join(base, 'nuxt.config.ts'),
      content: generateNuxtConfig(data)
    }
  ]
  
  // Write all files
  for (const file of files) {
    await fsp.writeFile(file.path, file.content, 'utf8')
    console.log(`✓ Generated ${path.relative(base, file.path)}`)
  }
  
  // Check if we're using translations
  const hasTranslations = config?.translations?.collections?.[cases.plural]?.length > 0

  // Update layer root nuxt.config.ts to extend the new collection (and translations layer if needed)
  await updateLayerRootConfig(layer, collection, hasTranslations)

  // Update root nuxt.config.ts to extend the layer
  await updateRootNuxtConfig(layer)
  
  // Create database table if requested
  if (!noDb) {
    await createDatabaseTable({ name: collection, layer, fields, force })
  }

  // Update collection registry
  const collectionKey = `${layer}${cases.pascalCase}`
  const componentName = `${layerPascalCase}${cases.pascalCasePlural}`
  await updateRegistry(layer, cases.plural, collectionKey, componentName)

  console.log(`\n✅ Successfully generated collection '${cases.plural}' in layer '${layer}'`)
  console.log(`\nNext steps:`)
  console.log(`1. Review the generated files in ${base}`)
  if (noDb) {
    console.log(`2. Update server/database/schema/index.ts to export the new schema`)
    console.log(`3. Run database migrations: pnpm db:generate && pnpm db:push`)
  }
  console.log(`${noDb ? '4' : '2'}. Restart your Nuxt dev server`)
}

async function main() {
  try {
    // Check if being called with config file
    if (process.argv[2] === '--config') {
      // Load config mode
      const configPath = path.resolve(process.argv[3] || './migrate.config.js')
      const config = (await import(configPath)).default
      
      // Handle both config formats
      if (config.collections && config.targets) {
        // Enhanced config format with collections array
        if (!config.targets || !config.collections) {
          console.error('Error: Invalid config file - missing targets or collections')
          process.exit(1)
        }
        
        // Create a map of collection names to their field files
        const collectionFieldsMap = {}
        for (const col of config.collections) {
          collectionFieldsMap[col.name] = col.fieldsFile
        }
        
        // Process each target
        for (const target of config.targets) {
          for (const collectionName of target.collections) {
            const fieldsFile = collectionFieldsMap[collectionName]
            if (!fieldsFile) {
              console.error(`Error: No fields file found for collection '${collectionName}'`)
              continue
            }
            
            console.log(`\nGenerating collection '${collectionName}' in layer '${target.layer}'...`)
            console.log(`  Using fields from: ${fieldsFile}`)
            
            const fields = await loadFields(fieldsFile)
            await writeScaffold({
              layer: target.layer,
              collection: collectionName,
              fields,
              dialect: config.dialect || 'pg',
              autoRelations: config.flags?.autoRelations || false,
              dryRun: false,
              noDb: config.flags?.noDb || false,
              force: config.flags?.force || false,
              noTranslations: config.flags?.noTranslations || false,
              config: config
            })
          }
        }
      } else if (config.targets && config.schemaPath) {
        // Original simple config format
        const fields = await loadFields(config.schemaPath)
        
        // Process each target
        for (const target of config.targets) {
          for (const collection of target.collections) {
            console.log(`\nGenerating collection '${collection}' in layer '${target.layer}'...`)
            await writeScaffold({
              layer: target.layer,
              collection,
              fields,
              dialect: config.dialect || 'pg',
              autoRelations: config.flags?.autoRelations || false,
              dryRun: false,
              noDb: config.flags?.noDb || false,
              force: config.flags?.force || false,
              noTranslations: config.flags?.noTranslations || false,
              config: config
            })
          }
        }
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
      const fields = await loadFields(args.fieldsFile)
      await writeScaffold({ ...args, fields })
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()