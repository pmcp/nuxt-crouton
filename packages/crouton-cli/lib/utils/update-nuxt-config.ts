// Update nuxt.config.ts extends array using magicast AST manipulation
// Replaces ~120 lines of regex-based string manipulation

import { readFile, writeFile, access } from 'node:fs/promises'
import { parseModule, generateCode } from 'magicast'
import { getFrameworkPackages } from './framework-packages.ts'

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Get the proxified options object from a nuxt.config module.
 * Handles both `export default { ... }` and `export default defineNuxtConfig({ ... })`.
 */
function getNuxtConfigOptions(mod: any): any {
  const defaultExport = mod.exports.default
  if (defaultExport.$type === 'function-call') {
    return defaultExport.$args[0]
  }
  return defaultExport
}

/**
 * Add a package to the extends array in nuxt.config.ts
 */
export async function addToNuxtConfigExtends(configPath: string, packageName: string): Promise<{ added: boolean; reason?: string }> {
  if (!await pathExists(configPath)) {
    return { added: false, reason: 'nuxt.config.ts not found' }
  }

  const code = await readFile(configPath, 'utf-8')

  // Quick check before parsing
  if (code.includes(packageName)) {
    return { added: false, reason: 'already in config' }
  }

  try {
    const mod = parseModule(code)
    const options = getNuxtConfigOptions(mod)

    // Ensure extends array exists
    options.extends ||= []

    // Add the package
    options.extends.push(packageName)

    const result = generateCode(mod)
    await writeFile(configPath, result.code, 'utf-8')
    return { added: true }
  } catch {
    return { added: false, reason: 'could not parse nuxt.config.ts' }
  }
}

/**
 * Remove a package or pattern from the extends array in nuxt.config.ts
 */
export async function removeFromNuxtConfigExtends(configPath: string, pattern: string): Promise<{ removed: boolean; reason?: string }> {
  if (!await pathExists(configPath)) {
    return { removed: false, reason: 'nuxt.config.ts not found' }
  }

  const code = await readFile(configPath, 'utf-8')

  if (!code.includes(pattern)) {
    return { removed: false, reason: 'not found in config' }
  }

  try {
    const mod = parseModule(code)
    const options = getNuxtConfigOptions(mod)

    if (!options.extends) {
      return { removed: false, reason: 'no extends array' }
    }

    // Filter out matching entries
    const extendsArr = options.extends
    const originalLength = extendsArr.length
    const filtered: string[] = []
    for (let i = 0; i < originalLength; i++) {
      const entry = String(extendsArr[i])
      if (!entry.includes(pattern)) {
        filtered.push(entry)
      }
    }

    if (filtered.length === originalLength) {
      return { removed: false, reason: 'not found in extends' }
    }

    // Replace extends array with filtered version
    options.extends = filtered

    const result = generateCode(mod)
    await writeFile(configPath, result.code, 'utf-8')
    return { removed: true }
  } catch {
    return { removed: false, reason: 'could not parse nuxt.config.ts' }
  }
}

/**
 * Check if a package is already in nuxt.config.ts extends
 */
export async function isInNuxtConfigExtends(configPath: string, packageName: string): Promise<boolean> {
  if (!await pathExists(configPath)) {
    return false
  }
  const content = await readFile(configPath, 'utf-8')
  return content.includes(packageName)
}

/**
 * Sync framework packages in nuxt.config.ts based on features config.
 * Removes getCroutonLayers() usage if present, then ensures all
 * feature-based packages are in the extends array.
 */
export async function syncFrameworkPackages(configPath: string, features: Record<string, boolean | Record<string, unknown>> = {}): Promise<{ synced: boolean; packages?: string[]; reason?: string }> {
  if (!await pathExists(configPath)) {
    return { synced: false, reason: 'nuxt.config.ts not found' }
  }

  let code = await readFile(configPath, 'utf-8')
  let modified = false

  // Remove getCroutonLayers() import if present
  const importRegex = /import\s*\{\s*getCroutonLayers\s*\}\s*from\s*['"]@fyit\/crouton['"]\s*\n?/g
  if (importRegex.test(code)) {
    code = code.replace(importRegex, '')
    modified = true
  }

  // Remove ...getCroutonLayers() spread if present
  const spreadRegex = /\.\.\.getCroutonLayers\([^)]*\),?\s*/g
  if (spreadRegex.test(code)) {
    code = code.replace(spreadRegex, '')
    modified = true
  }

  if (modified) {
    await writeFile(configPath, code, 'utf-8')
  }

  // Get framework packages based on features
  const packages = getFrameworkPackages(features)

  // Add each package to extends (handles deduplication)
  for (const pkg of packages) {
    await addToNuxtConfigExtends(configPath, pkg)
  }

  return { synced: true, packages }
}
