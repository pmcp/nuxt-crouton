import type { CollectionSchema, SchemaField } from '../types/schema'
import type { PackageInstance, PackageCollection, ConfigOption } from '../types/package-manifest'

// Note: useProjectComposer is auto-imported by Nuxt
// TypeScript errors in isolation are expected (see CLAUDE.md Known TypeScript Limitations)

/**
 * Export bundle containing all generated files and commands.
 */
export interface ExportBundle {
  nuxtConfig: string
  croutonConfig: string
  schemas: SchemaFile[]
  commands: string[]
  runtimeConfig: Record<string, unknown>
}

/**
 * Individual schema file for export.
 */
export interface SchemaFile {
  path: string
  filename: string
  content: string
}

/**
 * useExportGenerator - Generates configuration files for project export.
 *
 * Creates nuxt.config.ts, crouton.config.js, schema JSON files,
 * and CLI commands needed to set up the generated project.
 */
export function useExportGenerator() {
  const composer = useProjectComposer()

  /**
   * Generate nuxt.config.ts content with extends chain.
   */
  function generateNuxtConfig(): string {
    const { packages, baseLayerName, packageManifests } = composer

    // Collect all dependencies and layers
    const dependencies: string[] = []
    const layers: string[] = []

    // Add package dependencies
    for (const pkg of packages.value) {
      const manifest = packageManifests.value.get(pkg.packageId)
      if (manifest) {
        // Add package dependencies
        for (const dep of manifest.dependencies) {
          if (!dependencies.includes(dep)) {
            dependencies.push(dep)
          }
        }
        // Add the layer path for the generated layer
        layers.push(`'./layers/${pkg.layerName}'`)
      }
    }

    // Add base layer for custom collections
    if (composer.hasCustomCollections.value) {
      layers.push(`'./layers/${baseLayerName.value}'`)
    }

    // Build extends array
    const extendsArray = [
      ...dependencies.map((d: string) => `'${d}'`),
      ...layers
    ]

    // Generate runtime config
    const runtimeConfig = generateRuntimeConfig()
    const hasRuntimeConfig = Object.keys(runtimeConfig).length > 0

    // Build config
    let config = `export default defineNuxtConfig({
  extends: [
    ${extendsArray.join(',\n    ')}
  ],

  modules: [
    '@nuxthub/core'
  ],

  hub: {
    db: 'sqlite'
  }`

    if (hasRuntimeConfig) {
      config += `,

  runtimeConfig: ${JSON.stringify(runtimeConfig, null, 4).replace(/\n/g, '\n  ')}`
    }

    config += `
})`

    return config
  }

  /**
   * Generate crouton.config.js content.
   */
  function generateCroutonConfig(): string {
    const { packages, packageManifests, baseLayerName, customCollections } = composer

    // Group collections by layer
    const collectionsByLayer = new Map<string, { layerName: string; packageName?: string; collections: string[] }>()

    for (const collection of customCollections.value) {
      if (!collection.collectionName) continue

      let layerName = baseLayerName.value
      let packageName: string | undefined

      // If from a package, use the package's layer name
      if (collection.fromPackage) {
        const pkg = packages.value.find((p: PackageInstance) => p.packageId === collection.fromPackage)
        if (pkg) {
          layerName = pkg.layerName
          const manifest = packageManifests.value.get(pkg.packageId)
          packageName = manifest?.name
        }
      }

      if (!collectionsByLayer.has(layerName)) {
        collectionsByLayer.set(layerName, { layerName, packageName, collections: [] })
      }
      collectionsByLayer.get(layerName)!.collections.push(collection.collectionName)
    }

    const layerConfigs: string[] = []

    for (const [_layerName, layerData] of collectionsByLayer) {
      const collectionNames = layerData.collections.map(c => `'${c}'`)
      const comment = layerData.packageName || 'Custom Collections'

      layerConfigs.push(`  // ${comment}
  {
    layer: '${layerData.layerName}',
    collections: [${collectionNames.join(', ')}]
  }`)
    }

    return `/** @type {import('@friendlyinternet/nuxt-crouton-cli').CroutonConfig} */
export default {
  layers: [
${layerConfigs.join(',\n')}
  ]
}`
  }

  /**
   * Generate runtime config section for package settings.
   */
  function generateRuntimeConfig(): Record<string, unknown> {
    const { packages, packageManifests } = composer
    const config: Record<string, unknown> = {}
    const publicConfig: Record<string, unknown> = {}

    for (const pkg of packages.value) {
      const manifest = packageManifests.value.get(pkg.packageId)
      if (!manifest) continue

      // Convert packageId to config key (e.g., 'crouton-bookings' -> 'croutonBookings')
      const configKey = pkg.packageId
        .replace(/^crouton-/, '')
        .replace(/-([a-z])/g, (_match: string, letter: string) => letter.toUpperCase())

      // Build config object from non-default values
      const pkgConfig: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(pkg.configuration)) {
        const option = (manifest.configuration || {})[key] as ConfigOption | undefined
        // Include if different from default
        if (option && JSON.stringify(value) !== JSON.stringify(option.default)) {
          pkgConfig[key] = value
        }
      }

      // Only add if there are non-default values
      if (Object.keys(pkgConfig).length > 0) {
        config[configKey] = pkgConfig
        // Mirror to public config for client-side access
        publicConfig[configKey] = pkgConfig
      }
    }

    if (Object.keys(config).length === 0) {
      return {}
    }

    return {
      ...config,
      public: publicConfig
    }
  }

  /**
   * Generate schema JSON files for all collections.
   * Package-derived collections include both locked fields and user-added fields.
   */
  function generateSchemaFiles(): SchemaFile[] {
    const { customCollections, baseLayerName, packages, packageManifests } = composer
    const files: SchemaFile[] = []

    for (const collection of customCollections.value) {
      if (!collection.collectionName) continue

      // Determine the layer name for this collection
      let layerName = baseLayerName.value

      // If from a package, use the package's layer name
      if (collection.fromPackage) {
        const pkg = packages.value.find((p: PackageInstance) => p.packageId === collection.fromPackage)
        if (pkg) {
          layerName = pkg.layerName
        }
      }

      const schema = buildSchemaJson(collection)
      const filename = `${collection.collectionName}.json`

      files.push({
        path: `layers/${layerName}/schemas/${filename}`,
        filename,
        content: JSON.stringify(schema, null, 2)
      })
    }

    return files
  }

  /**
   * Build schema JSON from collection schema.
   */
  function buildSchemaJson(collection: CollectionSchema): Record<string, unknown> {
    const schema: Record<string, unknown> = {}

    for (const field of collection.fields) {
      schema[field.name] = buildFieldSchema(field)
    }

    return schema
  }

  /**
   * Build field schema object.
   */
  function buildFieldSchema(field: SchemaField): Record<string, unknown> {
    const fieldSchema: Record<string, unknown> = {
      type: field.type,
      meta: { ...field.meta }
    }

    if (field.refTarget) {
      fieldSchema.refTarget = field.refTarget
    }

    return fieldSchema
  }

  /**
   * Generate CLI commands to run for setup.
   */
  function generateCommands(): string[] {
    const { packages, baseLayerName, customCollections } = composer
    const commands: string[] = []

    // Generate all collections (package-derived and custom)
    for (const collection of customCollections.value) {
      if (!collection.collectionName) continue

      // Determine the layer name for this collection
      let layerName = baseLayerName.value

      // If from a package, use the package's layer name
      if (collection.fromPackage) {
        const pkg = packages.value.find((p: PackageInstance) => p.packageId === collection.fromPackage)
        if (pkg) {
          layerName = pkg.layerName
        }
      }

      commands.push(`pnpm crouton ${layerName} ${collection.collectionName}`)
    }

    // Add database migration commands
    if (commands.length > 0) {
      commands.push('')
      commands.push('# After generating collections:')
      commands.push('npx nuxt db generate')
      commands.push('npx nuxt db migrate')
    }

    return commands
  }

  /**
   * Generate complete export bundle.
   */
  function generateExportBundle(): ExportBundle {
    return {
      nuxtConfig: generateNuxtConfig(),
      croutonConfig: generateCroutonConfig(),
      schemas: generateSchemaFiles(),
      commands: generateCommands(),
      runtimeConfig: generateRuntimeConfig()
    }
  }

  /**
   * Generate setup instructions as markdown.
   */
  function generateInstructions(): string {
    const bundle = generateExportBundle()

    let md = `# Project Setup Instructions

## 1. Install Dependencies

\`\`\`bash
pnpm install
\`\`\`

## 2. Create Configuration Files

### nuxt.config.ts

\`\`\`typescript
${bundle.nuxtConfig}
\`\`\`

### crouton.config.js

\`\`\`javascript
${bundle.croutonConfig}
\`\`\`

`

    if (bundle.schemas.length > 0) {
      md += `## 3. Create Schema Files

`
      for (const schema of bundle.schemas) {
        md += `### ${schema.path}

\`\`\`json
${schema.content}
\`\`\`

`
      }
    }

    md += `## ${bundle.schemas.length > 0 ? '4' : '3'}. Generate Collections

Run these commands to generate your collections:

\`\`\`bash
${bundle.commands.join('\n')}
\`\`\`

## Next Steps

1. Start development server: \`pnpm dev\`
2. Access your app at http://localhost:3000
3. Run \`npx nuxt db generate\` when changing schemas
`

    return md
  }

  /**
   * Download export bundle as a zip file (returns data URL).
   * Note: Actual zip creation would need a library like JSZip.
   */
  function getDownloadableFiles(): Array<{ path: string; content: string }> {
    const bundle = generateExportBundle()
    const files: Array<{ path: string; content: string }> = []

    // Add config files
    files.push({
      path: 'nuxt.config.ts',
      content: bundle.nuxtConfig
    })

    files.push({
      path: 'crouton.config.js',
      content: bundle.croutonConfig
    })

    // Add schema files
    for (const schema of bundle.schemas) {
      files.push({
        path: schema.path,
        content: schema.content
      })
    }

    // Add setup instructions
    files.push({
      path: 'SETUP.md',
      content: generateInstructions()
    })

    return files
  }

  return {
    // Individual generators
    generateNuxtConfig,
    generateCroutonConfig,
    generateRuntimeConfig,
    generateSchemaFiles,
    generateCommands,
    generateInstructions,

    // Complete bundle
    generateExportBundle,
    getDownloadableFiles
  }
}
