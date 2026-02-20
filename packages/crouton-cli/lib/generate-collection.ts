#!/usr/bin/env node
// generate-collection.ts — Complete collection generator with modular architecture

import fsp from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { loadConfig } from 'c12'

// Import utilities
import { toCase, toSnakeCase } from './utils/helpers.ts'
import { loadTypeMapping } from './utils/manifest-bridge.ts'
import { detectRequiredDependencies, displayMissingDependencies, ensureLayersExtended } from './utils/module-detector.ts'
import { setupCroutonCssSource, displayManualCssSetupInstructions } from './utils/css-setup.ts'
import { syncFrameworkPackages, addToNuxtConfigExtends } from './utils/update-nuxt-config.ts'
import { addNamedSchemaExport } from './utils/update-schema-index.ts'
import { addToAppConfig, resolveAppConfigPath } from './utils/update-app-config.ts'
import { loadFields } from './utils/load-fields.ts'
import { validateConfig } from './utils/validate-config.ts'
import { updateLayerRootConfig, setupLayerI18n } from './utils/layer-config.ts'
import { exportI18nSchema } from './utils/i18n-schema.ts'

// Import generators
import { generateFormComponent } from './generators/form-component.ts'
import { generateListComponent } from './generators/list-component.ts'
import { generateComposable } from './generators/composable.ts'
import { generateCollectionReadme } from './generators/collection-readme.ts'
import {
  generateGetEndpoint,
  generatePostEndpoint,
  generatePatchEndpoint,
  generateDeleteEndpoint,
  generateMoveEndpoint,
  generateReorderEndpoint
} from './generators/api-endpoints.ts'
import { generateQueries } from './generators/database-queries.ts'
import { generateSchema } from './generators/database-schema.ts'
import { generateTypes } from './generators/types.ts'
import { generateNuxtConfig } from './generators/nuxt-config.ts'
import { generateRepeaterItemComponent } from './generators/repeater-item-component.ts'
import { generateFieldComponents } from './generators/field-components.ts'
import { generateSeedFile } from './generators/seed-data.ts'
import { generateCollectionTypesRegistry } from './generators/collection-types-registry.ts'

const execAsync = promisify(exec)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Field {
  name: string
  type: string
  meta: Record<string, any>
  refTarget?: string
  refScope?: string
  zod: string
  default: string
  tsType: string
}

interface WriteScaffoldOptions {
  layer: string
  collection: string
  fields: Field[]
  dialect: string
  autoRelations: boolean
  dryRun: boolean
  noDb: boolean
  force?: boolean
  noTranslations?: boolean
  config?: Record<string, any> | null
  collectionConfig?: Record<string, any> | null
  hierarchy?: boolean
  seed?: boolean
  seedCount?: number
}

interface RunConfigOptions {
  configPath?: string
  force?: boolean
  dryRun?: boolean
  only?: string
  noAutoMerge?: boolean
}

interface RunGenerateOptions {
  layer?: string
  collection?: string
  fieldsFile?: string
  dialect?: string
  autoRelations?: boolean
  dryRun?: boolean
  noDb?: boolean
  force?: boolean
  noTranslations?: boolean
  hierarchy?: boolean
  seed?: boolean
  seedCount?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// parseArgs() removed in Phase 5 — args now passed as options from citty entry point

// Build the schema export names for a collection (layer-prefixed)
function buildSchemaExportNames(collectionName: string, layer: string) {
  const cases = toCase(collectionName)
  const layerCamelCase = layer
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return {
    exportName: `${layerCamelCase}${cases.pascalCasePlural}`,
    importPath: `../../layers/${layer}/collections/${cases.plural}/server/database/schema`,
    schemaIndexPath: path.resolve('server', 'db', 'schema.ts')
  }
}

// Create database table using Drizzle
async function createDatabaseTable(config: { name: string; layer: string; fields?: Field[]; force?: boolean }): Promise<boolean> {
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
    const { exportName, importPath: schemaImportPath, schemaIndexPath } = buildSchemaExportNames(name, layer)
    const schemaResult = await addNamedSchemaExport(schemaIndexPath, exportName, schemaImportPath, force)
    const schemaUpdated = schemaResult.added || schemaResult.reason === 'already exported'

    if (!schemaUpdated) {
      if (schemaResult.reason?.startsWith('conflicting')) {
        console.error(`⚠️  Warning: ${schemaResult.reason}`)
        console.error(`   Use --force to override or choose a different name.`)
      }
      console.error(`✗ Schema index update failed due to conflicts`)
      console.error(`  Skipping database migration to avoid errors`)
      console.error(`  You can:`)
      console.error(`  1. Use --force to override the conflict`)
      console.error(`  2. Manually resolve the conflict in server/db/schema.ts`)
      console.error(`  3. Choose a different collection name`)
      return false
    }

    if (schemaResult.created) {
      console.log('✓ Created server/db/schema.ts with auth schema')
    }
    if (schemaResult.added) {
      console.log(`✓ Updated schema index with ${exportName} export`)
    } else {
      console.log(`✓ Schema index already contains ${exportName} export`)
    }

    // Run db:generate to sync with database (with timeout)
    console.log(`↻ Creating database migration...`)
    console.log(`! Running: npx nuxt db generate (30s timeout)`)

    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command timed out after 30 seconds')), 30000)
      })

      // Race between the command and timeout
      const { stdout, stderr } = await Promise.race([
        execAsync('npx nuxt db generate'),
        timeoutPromise
      ])

      if (stderr && !stderr.includes('Warning')) {
        console.error(`! Drizzle warnings:`, stderr)
      }
      console.log(`✓ Database migration generated`)

      // Note: The migration has been generated but needs to be applied
      console.log(`! Migration generated. The table will be created when you restart the dev server.`)

      return true
    } catch (execError: any) {
      if (execError.message.includes('timed out')) {
        console.error(`✗ Database migration timed out after 30 seconds`)
        console.error(`  This usually means there's a conflict or error in the schema`)
        console.error(`  Check server/db/schema.ts for duplicate exports`)
      } else {
        console.error(`✗ Failed to run database migration:`, execError.message)
      }
      console.log(`! You can manually run: npx nuxt db generate`)
      return false
    }
  } catch (error: any) {
    console.error(`✗ Failed to create database table:`, error.message)
    console.log(`! You may need to create the table manually with: npx nuxt db generate`)
    return false
  }
}

function buildGeneratorData(params: {
  layer: string
  collection: string
  fields: Field[]
  hierarchy: { enabled: boolean; parentField?: string; orderField?: string; pathField?: string; depthField?: string }
  sortable: { enabled: boolean; orderField?: string }
  collab: { enabled: boolean }
  config: Record<string, any> | null
  collectionConfig: Record<string, any> | null
}) {
  const { layer, collection, fields, hierarchy, sortable, collab, config, collectionConfig } = params
  const cases = toCase(collection)
  const layerPascalCase = layer
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const layerCamelCase = layer
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const fieldsSchema = (() => {
    const translatableFieldNames = config?.translations?.collections?.[cases.plural] || []
    const regularFieldsSchema = fields
      .filter(f => f.name !== 'id' && !translatableFieldNames.includes(f.name))
      .map((f) => {
        const isDependentField = (f.meta?.dependsOn && f.meta?.dependsOnCollection) || f.meta?.displayAs === 'slotButtonGroup'
        const hasRepeaterProperties = f.type === 'repeater' && (f.meta?.translatableProperties || f.meta?.properties)
        let baseZod = isDependentField ? 'z.array(z.string())' : f.zod
        if (hasRepeaterProperties) {
          const { pascalCase: fieldPascalCase } = toCase(f.name)
          const itemSchemaName = `${layerCamelCase}${cases.pascalCasePlural}${fieldPascalCase}ItemSchema`
          baseZod = `z.array(${itemSchemaName})`
        }
        if (f.meta?.required) {
          if (isDependentField) {
            return `${f.name}: ${baseZod}.min(1, '${f.name} is required')`
          } else if (f.type === 'date') {
            return `${f.name}: z.date({ required_error: '${f.name} is required' })`
          } else if (f.type === 'string' || f.type === 'text') {
            return `${f.name}: ${baseZod}.min(1, '${f.name} is required')`
          } else if (f.type === 'number' || f.type === 'decimal') {
            return `${f.name}: ${baseZod}`
          } else if (f.type === 'boolean') {
            return `${f.name}: ${baseZod}`
          } else if (f.type === 'json') {
            return `${f.name}: ${baseZod}`
          } else if (f.type === 'repeater') {
            return `${f.name}: ${baseZod}`
          } else {
            return `${f.name}: ${baseZod}`
          }
        } else {
          const suffix = f.meta?.nullable ? '.nullish()' : '.optional()'
          return `${f.name}: ${baseZod}${suffix}`
        }
      })
    const translatableFieldsSchema = fields
      .filter(f => translatableFieldNames.includes(f.name))
      .map(f => `${f.name}: ${f.zod}.optional()`)
    let allFieldsSchema = [...regularFieldsSchema, ...translatableFieldsSchema].join(',\n  ')
    if (hierarchy?.enabled) {
      const hierarchySchemaField = `parentId: z.string().nullable().optional()`
      allFieldsSchema = allFieldsSchema ? `${allFieldsSchema},\n  ${hierarchySchemaField}` : hierarchySchemaField
    }
    if (translatableFieldNames.length > 0) {
      const translatableFields = fields.filter(f => translatableFieldNames.includes(f.name))
      const requiredTranslatableFields = translatableFields.filter(f => f.meta?.required)
      const translationsFieldSchema = translatableFields.map((f) => {
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
    z.string(),
    z.object({
${translationsFieldSchema}
    })
  )${requiredFieldsCheck}`
    }
    return allFieldsSchema
  })()

  const fieldsDefault = (() => {
    let fieldDefaults = fields.filter(f => f.name !== 'id').map((f) => {
      const isDependentField = (f.meta?.dependsOn && f.meta?.dependsOnCollection) || f.meta?.displayAs === 'slotButtonGroup'
      if (isDependentField) {
        return `${f.name}: null`
      }
      return `${f.name}: ${f.default}`
    }).join(',\n    ')
    if (hierarchy?.enabled) {
      fieldDefaults = fieldDefaults ? `${fieldDefaults},\n    parentId: null` : 'parentId: null'
    }
    const hasTranslations = config?.translations?.collections?.[cases.plural]?.length > 0
    return hasTranslations ? `${fieldDefaults},\n    translations: {}` : fieldDefaults
  })()

  const fieldsColumns = (() => {
    const baseColumns = fields.map(f =>
      `{ accessorKey: '${f.name}', header: '${f.name.charAt(0).toUpperCase() + f.name.slice(1)}' }`
    ).join(',\n  ')
    const hasTranslations = config?.translations?.collections?.[cases.plural]?.length > 0
    const translationsColumn = hasTranslations
      ? ',\n  { accessorKey: \'translations\', header: \'Translations\' }'
      : ''
    return baseColumns + translationsColumn
  })()

  const fieldsTypes = fields.filter(f => f.name !== 'id').map((f) => {
    const isDependentField = (f.meta?.dependsOn && f.meta?.dependsOnCollection) || f.meta?.displayAs === 'slotButtonGroup'
    const tsType = isDependentField ? 'string[] | null' : f.tsType
    return `${f.name}${f.meta?.required ? '' : '?'}: ${tsType}`
  }).join('\n  ')

  return {
    ...cases,
    originalCollectionName: collection,
    layer,
    layerPascalCase,
    layerCamelCase,
    fields,
    fieldsSchema,
    fieldsDefault,
    fieldsColumns,
    fieldsTypes,
    hierarchy,
    sortable,
    collab,
    collectionConfig,
    display: collectionConfig?.display || null,
    publishable: collectionConfig?.publishable || false
  }
}

async function writeScaffold({ layer, collection, fields, dialect, autoRelations, dryRun, noDb, force = false, noTranslations = false, config = null, collectionConfig = null, hierarchy: hierarchyFlag = false, seed = false, seedCount = 25 }: WriteScaffoldOptions): Promise<void> {
  const cases = toCase(collection)
  const base = path.resolve('layers', layer, 'collections', cases.plural)

  // Detect hierarchy configuration from collection config or CLI flag
  const hierarchy = collectionConfig?.hierarchy === true || hierarchyFlag === true
    ? {
        enabled: true,
        parentField: 'parentId',
        orderField: 'order',
        pathField: 'path',
        depthField: 'depth'
      }
    : (typeof collectionConfig?.hierarchy === 'object'
        ? {
            enabled: true,
            parentField: collectionConfig.hierarchy.parentField || 'parentId',
            orderField: collectionConfig.hierarchy.orderField || 'order',
            pathField: collectionConfig.hierarchy.pathField || 'path',
            depthField: collectionConfig.hierarchy.depthField || 'depth'
          }
        : { enabled: false })

  // Detect sortable configuration (simpler than hierarchy, just needs order field for drag-and-drop)
  const sortable = collectionConfig?.sortable === true
    ? {
        enabled: true,
        orderField: collectionConfig.orderField || 'order'
      }
    : (typeof collectionConfig?.sortable === 'object'
        ? {
            enabled: true,
            orderField: collectionConfig.sortable.orderField || 'order'
          }
        : { enabled: false })

  // Detect collab configuration (enables presence indicators in List.vue)
  const collab = collectionConfig?.collab === true
    ? { enabled: true }
    : { enabled: false }

  // Handle translation configuration
  // Priority: 1) field-level meta.translatable, 2) collection-level translatable, 3) config.translations.collections
  if (!noTranslations) {
    // Check for field-level translatable markers (meta.translatable: true)
    const fieldLevelTranslatable = fields
      .filter(f => f.meta?.translatable === true)
      .map(f => f.name)

    // Check for collection-level translatable flag (auto-detect common patterns)
    let collectionLevelTranslatable = []
    if (collectionConfig?.translatable === true) {
      const autoDetectFieldNames = ['name', 'title', 'description', 'label',
        'placeholder', 'helpText', 'content', 'message',
        'remarkPrompt', 'terms', 'conditions', 'notes']
      collectionLevelTranslatable = fields
        .filter(f => autoDetectFieldNames.includes(f.name)
          && (f.type === 'string' || f.type === 'text' || f.type === 'richText'))
        .map(f => f.name)
    }

    // Get config-level translatable fields
    const configLevelTranslatable = config?.translations?.collections?.[cases.plural] || []

    // Merge all sources (field-level takes precedence, then collection-level, then config-level)
    const allTranslatableFields = [...new Set([
      ...fieldLevelTranslatable,
      ...collectionLevelTranslatable,
      ...configLevelTranslatable
    ])]

    if (allTranslatableFields.length > 0) {
      // Ensure config object exists
      if (!config) {
        config = {}
      }
      if (!config.translations) {
        config.translations = { collections: {} }
      }
      if (!config.translations.collections) {
        config.translations.collections = {}
      }
      config.translations.collections[cases.plural] = allTranslatableFields

      // Log the source of translatable fields
      if (fieldLevelTranslatable.length > 0) {
        console.log(`↻ Field-level translatable: ${fieldLevelTranslatable.join(', ')}`)
      }
      if (collectionLevelTranslatable.length > 0) {
        console.log(`↻ Auto-detected translatable (collection-level): ${collectionLevelTranslatable.join(', ')}`)
      }
      if (configLevelTranslatable.length > 0 && fieldLevelTranslatable.length === 0 && collectionLevelTranslatable.length === 0) {
        console.log(`↻ Config-level translatable: ${configLevelTranslatable.join(', ')}`)
      }
    }
  } else if (noTranslations && config) {
    // Override config to disable translations if flag is set
    config = {
      ...config,
      translations: { collections: {} } // Clear all translation configurations
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
  const data = buildGeneratorData({ layer, collection, fields, hierarchy, sortable, collab, config, collectionConfig })
  const { layerPascalCase, layerCamelCase } = data

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
    if (!collectionConfig?.formComponent) {
      console.log(`• ${base}/app/components/Form.vue`)
    } else {
      console.log(`• Form.vue skipped (using ${collectionConfig.formComponent})`)
    }
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
    if (seed) {
      console.log(`• ${base}/server/database/seed.ts (${seedCount} records)`)
    }
    console.log(`• ${base}/types.ts`)
    console.log(`• ${base}/nuxt.config.ts`)
    console.log(`• layers/${layer}/nuxt.config.ts (layer root config)`)
    console.log(`• nuxt.config.ts (root config - add layer to extends)`)
    if (!noDb) {
      console.log(`• Would update server/db/schema.ts`)
      console.log(`• Would generate database migration`)
    }

    if (repeaterComponents.size > 0) {
      console.log(`\n• Would generate ${repeaterComponents.size} placeholder repeater component(s):`)
      repeaterComponents.forEach((name) => {
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
  // All endpoints now use @crouton/auth for team-based authentication
  const files = [
    // Only generate Form.vue if no custom formComponent specified
    ...(collectionConfig?.formComponent ? [] : [{
      path: path.join(base, 'app', 'components', '_Form.vue'),
      content: generateFormComponent(data, config)
    }]),
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
      content: generateQueries(data, config, layer, (() => {
        const map = new Map<string, string>()
        if (config?.targets) {
          for (const t of config.targets) {
            for (const c of t.collections) {
              map.set(c.toLowerCase(), t.layer)
            }
          }
        }
        return map
      })())
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

      // Generate all three field components (pass full field object for translatableProperties support)
      const { input, select, cardMini } = generateFieldComponents(field, data)

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

  // Generate seed file if --seed flag is enabled
  if (seed) {
    files.push({
      path: path.join(base, 'server', 'database', 'seed.ts'),
      content: generateSeedFile(data, {
        seedCount,
        teamId: config?.seed?.defaultTeamId || 'seed-team'
      })
    })
    console.log(`  Generating seed.ts (${seedCount} records)`)
  }

  // Write all files
  for (const file of files) {
    await fsp.writeFile(file.path, file.content, 'utf8')
    console.log(`  ✓ ${path.relative(base, file.path)}`)
  }

  // Note: team-auth utility is now provided by @fyit/crouton package
  // No need to generate it per-layer

  // Check if we're using translations
  const hasTranslations = config?.translations?.collections?.[cases.plural]?.length > 0

  // Update layer root nuxt.config.ts to extend the new collection (and translations layer if needed)
  await updateLayerRootConfig(layer, collection, hasTranslations)

  // Create i18n locale files when translations are enabled
  if (hasTranslations) {
    await setupLayerI18n(layer, collection)
  }

  // Update root nuxt.config.ts to extend the layer
  const rootConfigPath = path.resolve('nuxt.config.ts')
  const nuxtResult = await addToNuxtConfigExtends(rootConfigPath, `./layers/${layer}`)
  if (nuxtResult.added) {
    console.log(`✓ Updated root nuxt.config.ts to extend layer '${layer}'`)
  } else if (nuxtResult.reason === 'already in config') {
    console.log(`✓ Root nuxt.config.ts already extends layer '${layer}'`)
  } else {
    console.error(`! Could not update root nuxt.config.ts: ${nuxtResult.reason}`)
    console.log(`  Please manually add './layers/${layer}' to the extends array`)
  }

  // Create database table if requested
  if (!noDb) {
    await createDatabaseTable({ name: collection, layer, fields, force })

    // Always export i18n schema since crouton-i18n is bundled with @fyit/crouton
    console.log(`↻ Ensuring translations_ui table...`)
    await exportI18nSchema(force)
  }

  // Update collection registry
  const collectionKey = `${layerCamelCase}${cases.pascalCasePlural}`
  const configExportName = `${layerCamelCase}${cases.pascalCasePlural}Config`
  const registryPath = await resolveAppConfigPath()
  const composablePath = path.resolve('layers', layer, 'collections', cases.plural, 'app', 'composables', `use${layerPascalCase}${cases.pascalCasePlural}.ts`)
  const rel = path.relative(path.dirname(registryPath), composablePath).replace(/\\/g, '/')
  const importSource = (rel.startsWith('.') ? rel : `./${rel}`).replace(/(\.ts|\.mts|\.cts|\.js|\.mjs|\.cjs)$/, '')
  const registryResult = await addToAppConfig(registryPath, collectionKey, configExportName, importSource)
  if (registryResult.created) {
    console.log(`↻ Creating app.config.ts with crouton collections`)
    console.log(`✓ Created app.config.ts with "${collectionKey}" entry`)
  } else if (registryResult.added) {
    console.log(`✓ Updated app.config.ts with "${collectionKey}" entry`)
  } else if (registryResult.reason === 'already registered') {
    console.log(`✓ Collection "${collectionKey}" already in registry`)
  } else {
    console.error(`Failed to update registry: ${registryResult.reason}`)
  }

  console.log(`\n✓ Successfully generated collection '${cases.plural}' in layer '${layer}'`)
}

interface PostGenerationOptions {
  allCollections: Array<{ name: string; layer: string; fields: Field[] }>
  config: Record<string, any>
  dryRun: boolean
  noDb: boolean
  force: boolean
}

async function runPostGeneration(opts: PostGenerationOptions): Promise<void> {
  const { allCollections, config, dryRun, noDb, force } = opts

  // Update schema index for all collections and run migration once (unless disabled)
  if (!noDb && !dryRun && allCollections.length > 0) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`  DATABASE SETUP`)
    console.log(`${'═'.repeat(60)}\n`)
    console.log(`Updating schema index for ${allCollections.length} collections...`)

    // Update schema index for each collection
    for (const col of allCollections) {
      const { exportName: colExportName, importPath: colImportPath, schemaIndexPath: colSchemaIndexPath } = buildSchemaExportNames(col.name, col.layer)
      const colSchemaResult = await addNamedSchemaExport(colSchemaIndexPath, colExportName, colImportPath, force)
      if (!colSchemaResult.added && colSchemaResult.reason !== 'already exported') {
        console.error(`  ✗ Failed to update schema index for ${col.name}: ${colSchemaResult.reason}`)
      }
    }

    // Always export i18n schema since crouton-i18n is bundled with @fyit/crouton
    // Note: exportI18nSchema() already calls registerTranslationsUiCollection() internally
    console.log(`\n↻ Ensuring translations_ui table...`)
    await exportI18nSchema(force)

    // Run database migration once for all collections
    console.log(`\nRunning database migration...`)
    console.log(`Command: npx nuxt db generate (30s timeout)`)

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command timed out after 30 seconds')), 30000)
      })

      const { stdout, stderr } = await Promise.race([
        execAsync('npx nuxt db generate'),
        timeoutPromise
      ])

      if (stderr && !stderr.includes('Warning')) {
        console.error(`⚠ Warnings:`, stderr)
      }
      console.log(`\n✓ Database migration generated successfully`)
    } catch (execError: any) {
      if (execError.message.includes('timed out')) {
        console.error(`\n✗ Database migration timed out after 30 seconds`)
        console.error(`  Check server/db/schema.ts for conflicts`)
      } else {
        console.error(`\n✗ Failed to run database migration:`, execError.message)
      }
      console.log(`\nManual command: npx nuxt db generate\n`)
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

  // Generate type registry for type-safe CRUD composables
  if (!dryRun) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`  TYPE REGISTRY`)
    console.log(`${'═'.repeat(60)}\n`)

    try {
      const registryResult = await generateCollectionTypesRegistry(process.cwd())
      console.log(`✓ Generated type registry with ${registryResult.collectionsCount} collection(s)`)
      console.log(`  → ${registryResult.outputPath}`)
    } catch (error: any) {
      console.log(`⚠ Could not generate type registry: ${error.message}`)
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ALL DONE!`)
  console.log(`${'═'.repeat(60)}\n`)
  console.log(`Next step: Restart your Nuxt dev server\n`)
}

/**
 * Run config-based generation.
 */
export async function runConfig(options: RunConfigOptions = {}): Promise<void> {
  try {
    const typeMapping = await loadTypeMapping()

    // Resolve configPath to absolute so c12 can locate it and _configDir is always correct
    const resolvedConfigPath = options.configPath
      ? path.resolve(process.cwd(), options.configPath)
      : undefined
    const configCwd = resolvedConfigPath ? path.dirname(resolvedConfigPath) : process.cwd()

    const { config } = await loadConfig({
      name: 'crouton',
      cwd: configCwd,
      configFile: resolvedConfigPath || undefined,
      defaults: {
        dialect: 'sqlite',
        features: {},
        flags: {}
      }
    })

    if (!config || (Object.keys(config).length === 0)) {
      console.error(`\n❌ Config file not found\n`)
      process.exit(1)
    }

    // Store config file directory for downstream path resolution (fieldsFile in collections)
    // Always derived from the resolved config path, not process.cwd()
    config._configDir = resolvedConfigPath
      ? path.dirname(resolvedConfigPath)
      : (config._configFile ? path.dirname(config._configFile) : process.cwd())

    // Merge CLI flags into config.flags (CLI flags override config file)
    if (!config.flags) config.flags = {}
    if (options.force) config.flags.force = true
    if (options.dryRun) config.flags.dryRun = true

    // Single-collection filter
    const onlyCollection = options.only || null
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

      // Sync framework packages based on features config
      if (config.features) {
        console.log('\n' + '═'.repeat(60))
        console.log('  FRAMEWORK PACKAGES')
        console.log('═'.repeat(60) + '\n')
        console.log('↻ Syncing framework packages...')
        const nuxtConfigPath = path.resolve('nuxt.config.ts')
        const result = await syncFrameworkPackages(nuxtConfigPath, config.features)
        if (result.synced) {
          console.log(`✓ Synced ${result.packages.length} framework packages to extends`)
          result.packages.forEach(pkg => console.log(`  • ${pkg}`))
        } else {
          console.log(`⚠ Could not sync framework packages: ${result.reason}`)
        }
      }

      // Auto-merge package manifest collections for enabled features
      if (config.features && !options.noAutoMerge) {
        const { mergeManifestCollections } = await import('./utils/manifest-merge.ts')
        const mergeResult = await mergeManifestCollections(config)
        if (mergeResult.merged > 0) {
          console.log('\n' + '═'.repeat(60))
          console.log('  PACKAGE COLLECTIONS (auto-merged)')
          console.log('═'.repeat(60))
          mergeResult.collections.forEach(c =>
            console.log(`  + ${c.layer}/${c.name} (from @fyit/crouton-${c.feature})`)
          )
          if (mergeResult.skipped.length > 0) {
            console.log(`\n  Already in config: ${mergeResult.skipped.join(', ')}`)
          }
        }
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
            const fields = await loadFields(resolvedFieldsFile, typeMapping)

            // Check if this collection has translations
            // Generate files but skip database creation (we'll do it in batch at the end)
            // Determine seed settings from collection config or global config
            const collectionSeed = collectionConfig?.seed === true
              ? { count: config?.seed?.defaultCount || 25 }
              : typeof collectionConfig?.seed === 'object'
                ? collectionConfig.seed
                : null

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
              config: config,
              collectionConfig: collectionConfig, // Pass individual collection config for hierarchy detection
              seed: !!collectionSeed,
              seedCount: collectionSeed?.count || config?.seed?.defaultCount || 25
            })

            allCollections.push({ name: collectionName, layer: target.layer, fields })
          }
        }

        await runPostGeneration({
          allCollections,
          config,
          dryRun: config.flags?.dryRun || false,
          noDb: config.flags?.noDb || false,
          force: config.flags?.force || false,
        })
      } else if (config.targets && config.schemaPath) {
        // Original simple config format
        const fields = await loadFields(config.schemaPath, typeMapping)

        // Track all collections for batch db:generate
        const allCollections = []

        // Process each target
        for (const target of config.targets) {
          for (const collection of target.collections) {
            console.log(`\nGenerating collection '${collection}' in layer '${target.layer}'...`)

            // Check for global seed settings (this code path doesn't have per-collection config)
            const globalSeed = config?.seed?.enabled === true || config?.flags?.seed === true

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
              config: config,
              seed: globalSeed,
              seedCount: config?.seed?.defaultCount || 25
            })

            allCollections.push({ name: collection, layer: target.layer, fields })
          }
        }

        await runPostGeneration({
          allCollections,
          config,
          dryRun: config.flags?.dryRun || false,
          noDb: config.flags?.noDb || false,
          force: config.flags?.force || false,
        })
      } else {
        console.error('Error: Invalid config file')
        console.error('Config must have either:')
        console.error('  1. collections[] and targets[] (enhanced format)')
        console.error('  2. schemaPath and targets[] (simple format)')
        process.exit(1)
      }
  } catch (error: any) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

/**
 * Run single-collection generation with explicit args.
 */
export async function runGenerate(options: RunGenerateOptions = {}): Promise<void> {
  try {
    const typeMapping = await loadTypeMapping()
    const args = {
      layer: options.layer,
      collection: options.collection,
      fieldsFile: options.fieldsFile,
      dialect: options.dialect || 'sqlite',
      autoRelations: options.autoRelations || false,
      dryRun: options.dryRun || false,
      noDb: options.noDb || false,
      force: options.force || false,
      noTranslations: options.noTranslations || false,
      hierarchy: options.hierarchy || false,
      seed: options.seed || false,
      seedCount: options.seedCount || 25
    }

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
          console.log('  crouton install\n')
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
      fields = await loadFields(args.fieldsFile, typeMapping)
      console.log(`✓ Loaded ${fields.length} fields from schema`)
    } catch (error: any) {
      console.error(`\n❌ Error loading schema: ${error.message}\n`)
      process.exit(1)
    }

    // Proceed with generation
    await writeScaffold({ ...args, fields })

    // Generate type registry for type-safe CRUD composables
    if (!args.dryRun) {
      console.log(`\n${'═'.repeat(60)}`)
      console.log(`  TYPE REGISTRY`)
      console.log(`${'═'.repeat(60)}\n`)

      try {
        const registryResult = await generateCollectionTypesRegistry(process.cwd())
        console.log(`✓ Generated type registry with ${registryResult.collectionsCount} collection(s)`)
        console.log(`  → ${registryResult.outputPath}`)
      } catch (error: any) {
        console.log(`⚠ Could not generate type registry: ${error.message}`)
      }

      console.log(`\n${'═'.repeat(60)}`)
      console.log(`  ALL DONE!`)
      console.log(`${'═'.repeat(60)}\n`)
      console.log(`Next step: Restart your Nuxt dev server\n`)
    }
  } catch (error: any) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}
