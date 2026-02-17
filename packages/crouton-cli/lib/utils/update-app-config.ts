// Update app.config.ts — add/remove entries in croutonCollections using magicast
// Replaces ~80 lines of regex-based object insertion

import { readFile, writeFile, access, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseModule, generateCode, builders } from 'magicast'

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Resolve the app.config.ts path (handles Nuxt 4 app/ directory).
 */
export async function resolveAppConfigPath(cwd = process.cwd()): Promise<string> {
  const appDirExists = await stat(resolve(cwd, 'app')).then(() => true).catch(() => false)
  return appDirExists
    ? resolve(cwd, 'app/app.config.ts')
    : resolve(cwd, 'app.config.ts')
}

/**
 * Get the proxified options from a defineAppConfig() call or plain export.
 */
function getAppConfigOptions(mod: any): any {
  const defaultExport = mod.exports.default
  if (defaultExport.$type === 'function-call') {
    return defaultExport.$args[0]
  }
  return defaultExport
}

/**
 * Add a collection entry to croutonCollections in app.config.ts.
 * Adds the import statement and the collection key: configName entry.
 */
export async function addToAppConfig(registryPath: string, collectionKey: string, configName: string, importSource: string): Promise<{ added: boolean; created?: boolean; reason?: string }> {
  const fileExist = await pathExists(registryPath)

  if (!fileExist) {
    // Create initial app.config.ts
    const code = `import { ${configName} } from '${importSource}'

export default defineAppConfig({
  croutonCollections: {
    ${collectionKey}: ${configName},
  }
})
`
    await writeFile(registryPath, code, 'utf-8')
    return { added: true, created: true }
  }

  const code = await readFile(registryPath, 'utf-8')

  // Check if already registered
  if (code.includes(`${collectionKey}:`)) {
    return { added: false, reason: 'already registered' }
  }

  try {
    const mod = parseModule(code)

    // Ensure the import exists
    const hasImport = mod.imports.$items.some(
      (item: any) => item.local === configName || item.imported === configName,
    )
    if (!hasImport) {
      mod.imports.$append({
        imported: configName,
        from: importSource,
      })
    }

    // Ensure croutonCollections exists
    const options = getAppConfigOptions(mod)
    options.croutonCollections ||= {}

    // Add the collection entry as an identifier reference (not a string literal)
    options.croutonCollections[collectionKey] = builders.raw(configName)

    const result = generateCode(mod)
    await writeFile(registryPath, result.code, 'utf-8')
    return { added: true }
  } catch {
    return { added: false, reason: 'could not parse app.config.ts' }
  }
}

/**
 * Remove a collection entry from croutonCollections in app.config.ts.
 * Removes both the import statement and the collection key.
 */
export async function removeFromAppConfig(registryPath: string, collectionKey: string, configName: string): Promise<{ removed: boolean; reason?: string }> {
  if (!await pathExists(registryPath)) {
    return { removed: false, reason: 'app.config.ts not found' }
  }

  const code = await readFile(registryPath, 'utf-8')

  if (!code.includes(collectionKey)) {
    return { removed: false, reason: 'collection not found' }
  }

  try {
    const mod = parseModule(code)

    // Remove the import
    if (mod.imports[configName]) {
      delete mod.imports[configName]
    }

    // Remove the collection entry
    const options = getAppConfigOptions(mod)
    if (options.croutonCollections && options.croutonCollections[collectionKey] !== undefined) {
      delete options.croutonCollections[collectionKey]
    }

    const result = generateCode(mod)
    await writeFile(registryPath, result.code, 'utf-8')
    return { removed: true }
  } catch {
    return { removed: false, reason: 'could not parse app.config.ts' }
  }
}

/**
 * Register translationsUi collection in app.config.ts.
 * Convenience wrapper for the i18n translations UI collection.
 */
export async function registerTranslationsUiCollection(cwd = process.cwd()): Promise<boolean> {
  const registryPath = await resolveAppConfigPath(cwd)

  const result = await addToAppConfig(
    registryPath,
    'translationsUi',
    'translationsUiConfig',
    '@fyit/crouton-i18n/app/composables/useTranslationsUi',
  )

  if (result.created) {
    console.log('✓ Created app.config.ts with translationsUi collection')
  } else if (result.added) {
    console.log('✓ Registered translationsUi collection in app.config.ts')
  } else if (result.reason === 'already registered') {
    console.log('✓ translationsUi collection already registered in app.config.ts')
  } else {
    console.error(`! Could not register translationsUi collection: ${result.reason}`)
    console.log('  Please manually add to app.config.ts:')
    console.log("    import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'")
    console.log('    croutonCollections: { translationsUi: translationsUiConfig }')
    return false
  }

  return result.added || false
}
