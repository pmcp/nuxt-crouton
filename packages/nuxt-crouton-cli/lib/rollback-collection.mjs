#!/usr/bin/env node
// rollback-collection.mjs — Safely rollback generated collections

import fsp from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'

// Import utilities
import { toCase } from './utils/helpers.mjs'

export async function fileExists(filepath) {
  try {
    await fsp.access(filepath)
    return true
  } catch {
    return false
  }
}

export async function removeDirectory(dirPath, dryRun) {
  if (await fileExists(dirPath)) {
    if (dryRun) {
      console.log(chalk.yellow(`  [DRY RUN] Would remove: ${dirPath}`))
      return true
    }
    await fsp.rm(dirPath, { recursive: true, force: true })
    console.log(chalk.green(`  ✓ Removed: ${dirPath}`))
    return true
  }
  return false
}

export async function removeFile(filePath, dryRun) {
  if (await fileExists(filePath)) {
    if (dryRun) {
      console.log(chalk.yellow(`  [DRY RUN] Would remove: ${filePath}`))
      return true
    }
    await fsp.unlink(filePath)
    console.log(chalk.green(`  ✓ Removed: ${filePath}`))
    return true
  }
  return false
}

export async function cleanSchemaIndex(collectionName, layer, dryRun) {
  const schemaIndexPath = path.resolve('server', 'database', 'schema', 'index.ts')

  if (!await fileExists(schemaIndexPath)) {
    console.log(chalk.gray('  ! Schema index not found, skipping'))
    return false
  }

  try {
    const cases = toCase(collectionName)
    const content = await fsp.readFile(schemaIndexPath, 'utf-8')

    // Convert layer to camelCase for export name
    const layerCamelCase = layer
      .split(/[-_]/)
      .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    const exportName = `${layerCamelCase}${cases.plural.charAt(0).toUpperCase() + cases.plural.slice(1)}`

    // Remove the export line
    const exportPattern = new RegExp(
      `export\\s*{[^}]*${exportName}[^}]*}\\s*from\\s*['"][^'"]*${layer}/collections/${cases.plural}[^'"]*['"]\\s*\n?`,
      'g'
    )

    if (!content.match(exportPattern)) {
      console.log(chalk.gray(`  ! Export "${exportName}" not found in schema index`))
      return false
    }

    if (dryRun) {
      console.log(chalk.yellow(`  [DRY RUN] Would remove export "${exportName}" from schema index`))
      return true
    }

    const updatedContent = content.replace(exportPattern, '')
    await fsp.writeFile(schemaIndexPath, updatedContent)
    console.log(chalk.green(`  ✓ Removed export "${exportName}" from schema index`))
    return true
  } catch (error) {
    console.error(chalk.red(`  ✗ Error cleaning schema index: ${error.message}`))
    return false
  }
}

export async function cleanAppConfig(collectionName, layer, dryRun) {
  const cases = toCase(collectionName)

  // Check both possible locations for app.config.ts
  const appDirExists = await fileExists(path.resolve('app'))
  const registryPath = appDirExists
    ? path.resolve('app/app.config.ts')
    : path.resolve('app.config.ts')

  if (!await fileExists(registryPath)) {
    console.log(chalk.gray('  ! app.config.ts not found, skipping'))
    return false
  }

  try {
    let content = await fsp.readFile(registryPath, 'utf-8')

    // Convert layer to PascalCase for export name
    const layerPascalCase = layer
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    // Convert layer to camelCase for collection key
    const layerCamelCase = layer
      .split(/[-_]/)
      .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
      .join('')

    const collectionKey = `${layerCamelCase}${cases.pascalCasePlural}`
    const configExportName = `${layerPascalCase.toLowerCase()}${cases.pascalCasePlural}Config`

    // Check if the collection exists in the registry
    if (!content.includes(collectionKey)) {
      console.log(chalk.gray(`  ! Collection "${collectionKey}" not found in app.config.ts`))
      return false
    }

    if (dryRun) {
      console.log(chalk.yellow(`  [DRY RUN] Would remove "${collectionKey}" from app.config.ts`))
      console.log(chalk.yellow(`  [DRY RUN] Would remove import for "${configExportName}"`))
      return true
    }

    // Remove the import statement
    const importPattern = new RegExp(
      `import\\s*{[^}]*${configExportName}[^}]*}\\s*from\\s*['"][^'"]*['"]\\s*\n?`,
      'g'
    )
    content = content.replace(importPattern, '')

    // Remove the collection entry from croutonCollections
    const entryPattern = new RegExp(
      `\\s*${collectionKey}:\\s*${configExportName},?\\s*\n?`,
      'g'
    )
    content = content.replace(entryPattern, '\n')

    // Clean up empty croutonCollections object if it exists
    content = content.replace(/croutonCollections:\s*\{\s*\}/g, '')

    // Clean up extra blank lines
    content = content.replace(/\n{3,}/g, '\n\n')

    await fsp.writeFile(registryPath, content)
    console.log(chalk.green(`  ✓ Removed "${collectionKey}" from app.config.ts`))
    return true
  } catch (error) {
    console.error(chalk.red(`  ✗ Error cleaning app.config.ts: ${error.message}`))
    return false
  }
}

export async function cleanLayerRootConfig(layer, collectionName, dryRun) {
  const cases = toCase(collectionName)
  const configPath = path.resolve('layers', layer, 'nuxt.config.ts')

  if (!await fileExists(configPath)) {
    console.log(chalk.gray(`  ! Layer config not found at ${configPath}`))
    return false
  }

  try {
    let content = await fsp.readFile(configPath, 'utf-8')
    const collectionPath = `'./collections/${cases.plural}'`

    if (!content.includes(collectionPath)) {
      console.log(chalk.gray(`  ! Collection not found in layer config`))
      return false
    }

    if (dryRun) {
      console.log(chalk.yellow(`  [DRY RUN] Would remove "${collectionPath}" from layer config`))
      return true
    }

    // Remove the collection from extends array
    const extendsMatch = content.match(/extends:\s*\[([\s\S]*?)\]/)
    if (extendsMatch) {
      const currentExtends = extendsMatch[1]
      const lines = currentExtends.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.includes(collectionPath))

      if (lines.length === 0) {
        // If no more collections, keep empty extends array
        content = content.replace(/extends:\s*\[[^\]]*\]/, 'extends: [\n  ]')
      } else {
        // Format remaining entries
        const formattedLines = lines.map((line, index) => {
          const cleanLine = line.replace(/,+$/, '')
          return index < lines.length - 1 ? `    ${cleanLine},` : `    ${cleanLine}`
        })
        const updatedExtends = formattedLines.join('\n')
        content = content.replace(extendsMatch[0], `extends: [\n${updatedExtends}\n  ]`)
      }

      await fsp.writeFile(configPath, content)
      console.log(chalk.green(`  ✓ Removed collection from layer config`))
      return true
    }

    return false
  } catch (error) {
    console.error(chalk.red(`  ✗ Error cleaning layer config: ${error.message}`))
    return false
  }
}

export async function cleanRootNuxtConfig(layer, dryRun, forceRemove = false) {
  const rootConfigPath = path.resolve('nuxt.config.ts')

  if (!await fileExists(rootConfigPath)) {
    console.log(chalk.gray('  ! Root nuxt.config.ts not found'))
    return false
  }

  try {
    let content = await fsp.readFile(rootConfigPath, 'utf-8')
    const layerPath = `'./layers/${layer}'`

    if (!content.includes(layerPath)) {
      console.log(chalk.gray(`  ! Layer "${layer}" not in root config`))
      return false
    }

    // Check if other collections in this layer exist (unless forced)
    if (!forceRemove) {
      const layerDir = path.resolve('layers', layer, 'collections')
      const collectionsExist = await fileExists(layerDir)
      let hasOtherCollections = false

      if (collectionsExist) {
        const collections = await fsp.readdir(layerDir)
        hasOtherCollections = collections.length > 0
      }

      if (hasOtherCollections) {
        console.log(chalk.yellow(`  ! Layer "${layer}" has other collections, keeping in root config`))
        return false
      }
    }

    if (dryRun) {
      console.log(chalk.yellow(`  [DRY RUN] Would remove layer "${layer}" from root config`))
      return true
    }

    // Remove the layer from extends array
    const extendsMatch = content.match(/extends:\s*\[([\s\S]*?)\]/)
    if (extendsMatch) {
      const currentExtends = extendsMatch[1]
      const lines = currentExtends.split('\n')
        .map(line => line.trim().replace(/,?\s*$/, ''))
        .filter(line => line && !line.includes(layerPath))

      const formattedLines = lines.map((line, index) => {
        return index < lines.length - 1 ? `    ${line},` : `    ${line}`
      })

      const updatedExtends = formattedLines.join('\n')
      content = content.replace(extendsMatch[0], `extends: [\n${updatedExtends}\n  ]`)

      await fsp.writeFile(rootConfigPath, content)
      console.log(chalk.green(`  ✓ Removed layer "${layer}" from root config`))
      return true
    }

    return false
  } catch (error) {
    console.error(chalk.red(`  ✗ Error cleaning root config: ${error.message}`))
    return false
  }
}

export async function checkForCollectionFiles(layer, collection) {
  const cases = toCase(collection)
  const base = path.resolve('layers', layer, 'collections', cases.plural)

  const exists = await fileExists(base)
  if (!exists) {
    return { exists: false, files: [] }
  }

  const files = []

  // Check for key files
  const keyPaths = [
    path.join(base, 'app', 'components', 'Form.vue'),
    path.join(base, 'app', 'components', 'List.vue'),
    path.join(base, 'server', 'database', 'schema.ts'),
    path.join(base, 'server', 'database', 'queries.ts')
  ]

  for (const filePath of keyPaths) {
    if (await fileExists(filePath)) {
      files.push(filePath)
    }
  }

  return { exists: true, files }
}

export async function rollbackCollection({ layer, collection, dryRun = false, keepFiles = false, silent = false }) {
  const cases = toCase(collection)
  let changesMade = false

  if (!silent) {
    console.log(chalk.bold('\n─'.repeat(60)))
    console.log(chalk.bold(`  Rolling back ${layer}/${collection}`))
    console.log(chalk.bold('─'.repeat(60)) + '\n')
  }

  // Step 1: Remove files (unless --keep-files)
  if (!keepFiles) {
    if (!silent) console.log(chalk.bold('1. Removing collection files...'))
    const base = path.resolve('layers', layer, 'collections', cases.plural)
    if (await removeDirectory(base, dryRun)) {
      changesMade = true
    }
  } else {
    if (!silent) console.log(chalk.gray('1. Keeping collection files (--keep-files)'))
  }

  // Step 2: Clean schema index
  if (!silent) console.log(chalk.bold('\n2. Cleaning schema index...'))
  if (await cleanSchemaIndex(collection, layer, dryRun)) {
    changesMade = true
  }

  // Step 3: Clean app.config.ts
  if (!silent) console.log(chalk.bold('\n3. Cleaning app.config.ts...'))
  if (await cleanAppConfig(collection, layer, dryRun)) {
    changesMade = true
  }

  // Step 4: Clean layer root config
  if (!silent) console.log(chalk.bold('\n4. Cleaning layer root config...'))
  if (await cleanLayerRootConfig(layer, collection, dryRun)) {
    changesMade = true
  }

  // Step 5: Check root config (only if no other collections remain)
  if (!silent) console.log(chalk.bold('\n5. Checking root nuxt.config.ts...'))
  const layerDir = path.resolve('layers', layer, 'collections')
  const collectionsExist = await fileExists(layerDir)

  if (!collectionsExist || !keepFiles) {
    if (await cleanRootNuxtConfig(layer, dryRun)) {
      changesMade = true
    }
  } else {
    if (!silent) console.log(chalk.gray('  ! Other collections exist, keeping layer in root config'))
  }

  return changesMade
}

function parseArgs() {
  const a = process.argv.slice(2)
  const pos = a.filter(x => !x.startsWith('--'))

  let layer, collection
  if (pos.length >= 2) {
    layer = pos[0]
    collection = pos[1]
  } else {
    collection = pos[0]
    const layerFlag = a.find(x => x.startsWith('--layer='))
    layer = layerFlag ? layerFlag.split('=')[1] : null
  }

  const dryRun = a.includes('--dry-run')
  const keepFiles = a.includes('--keep-files')
  const force = a.includes('--force')

  if (!layer || !collection) {
    console.log('Usage: crouton-rollback <layer> <collection> [options]')
    console.log('\nOptions:')
    console.log('  --dry-run      Preview what will be removed')
    console.log('  --keep-files   Keep generated files, only clean configs')
    console.log('  --force        Skip confirmation prompts')
    process.exit(1)
  }

  return { layer, collection, dryRun, keepFiles, force }
}

async function main() {
  const args = parseArgs()
  const cases = toCase(args.collection)

  console.log('\n' + chalk.bold('═'.repeat(60)))
  console.log(chalk.bold('  COLLECTION ROLLBACK'))
  console.log(chalk.bold('═'.repeat(60)) + '\n')

  console.log(chalk.cyan(`Layer:      ${args.layer}`))
  console.log(chalk.cyan(`Collection: ${args.collection}`))
  console.log(chalk.cyan(`Dry Run:    ${args.dryRun ? 'Yes' : 'No'}`))
  console.log(chalk.cyan(`Keep Files: ${args.keepFiles ? 'Yes' : 'No'}`))

  // Check if collection exists
  const { exists, files } = await checkForCollectionFiles(args.layer, args.collection)

  if (!exists) {
    console.log(chalk.red(`\n✗ Collection not found at layers/${args.layer}/collections/${cases.plural}`))
    process.exit(1)
  }

  console.log(chalk.green(`\n✓ Found collection with ${files.length} key files`))

  // Show what will be removed
  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  CHANGES TO BE MADE'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  if (!args.keepFiles) {
    console.log(chalk.yellow(`• Remove collection directory`))
    console.log(chalk.gray(`  layers/${args.layer}/collections/${cases.plural}/`))
  }

  console.log(chalk.yellow(`• Clean schema index exports`))
  console.log(chalk.gray(`  server/database/schema/index.ts`))

  console.log(chalk.yellow(`• Remove from app.config.ts`))
  console.log(chalk.gray(`  app.config.ts or app/app.config.ts`))

  console.log(chalk.yellow(`• Clean layer root config`))
  console.log(chalk.gray(`  layers/${args.layer}/nuxt.config.ts`))

  console.log(chalk.yellow(`• Check root nuxt.config.ts`))
  console.log(chalk.gray(`  nuxt.config.ts (if no other collections remain)`))

  // Confirmation prompt (unless force or dry-run)
  if (!args.force && !args.dryRun) {
    console.log('\n' + chalk.red(chalk.bold('⚠️  WARNING: This action cannot be undone!')))
    console.log(chalk.yellow('Run with --dry-run to preview changes first'))
    console.log(chalk.gray('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...'))

    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  EXECUTING ROLLBACK'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  const changesMade = await rollbackCollection(args)

  // Summary
  console.log('\n' + chalk.bold('═'.repeat(60)))
  if (args.dryRun) {
    console.log(chalk.bold('  DRY RUN COMPLETE'))
    console.log(chalk.bold('═'.repeat(60)) + '\n')
    console.log(chalk.yellow('No changes were made. Run without --dry-run to execute.'))
  } else {
    console.log(chalk.bold('  ROLLBACK COMPLETE'))
    console.log(chalk.bold('═'.repeat(60)) + '\n')

    if (changesMade) {
      console.log(chalk.green('✓ Collection successfully rolled back'))
      console.log(chalk.yellow('\n⚠️  Next steps:'))
      console.log(chalk.gray('  1. Run: pnpm db:generate (to remove database migration)'))
      console.log(chalk.gray('  2. Restart your Nuxt dev server'))
    } else {
      console.log(chalk.yellow('! No changes were made (collection may not exist)'))
    }
  }

  console.log()
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('\n✗ Fatal error:'), error.message)
    process.exit(1)
  })
}
