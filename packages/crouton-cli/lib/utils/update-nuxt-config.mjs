// Update nuxt.config.ts to add a package to the extends array

import fs from 'fs-extra'
import { getFrameworkPackages } from './framework-packages.mjs'

/**
 * Add a package to the extends array in nuxt.config.ts
 * @param {string} configPath - Path to nuxt.config.ts
 * @param {string} packageName - Package name to add
 * @returns {Promise<{added: boolean, reason?: string}>}
 */
export async function addToNuxtConfigExtends(configPath, packageName) {
  if (!await fs.pathExists(configPath)) {
    return { added: false, reason: 'nuxt.config.ts not found' }
  }

  let content = await fs.readFile(configPath, 'utf-8')

  // Check if already present
  if (content.includes(packageName)) {
    return { added: false, reason: 'already in config' }
  }

  // Try to find extends array
  const extendsMatch = content.match(/extends\s*:\s*\[([\s\S]*?)\]/)

  if (extendsMatch) {
    // extends array exists - add to it
    const existingExtends = extendsMatch[1].trim()

    if (existingExtends) {
      // Has existing entries - need to handle comments properly
      // Find the last quoted string entry and check if it has a trailing comma
      // Pattern: match last string (single or double quoted) possibly followed by comma and/or comment
      const lastEntryMatch = existingExtends.match(/(['"`][^'"`]+['"`])\s*(,)?\s*(\/\/[^\n]*)?[\s]*$/)

      let newExtends
      if (lastEntryMatch) {
        const hasComma = !!lastEntryMatch[2]
        const comment = lastEntryMatch[3] || ''

        if (hasComma) {
          // Already has comma, just add new entry
          newExtends = existingExtends + `\n    '${packageName}'`
        } else {
          // No comma after last entry - need to insert one
          // Replace the last entry with: entry + comma + comment (if any) + newline + new entry
          const lastEntry = lastEntryMatch[1]
          const beforeLastEntry = existingExtends.slice(0, existingExtends.lastIndexOf(lastEntry))
          newExtends = beforeLastEntry + lastEntry + ',' + (comment ? ' ' + comment : '') + `\n    '${packageName}'`
        }
      } else {
        // Fallback: simple append with comma
        const hasTrailingComma = existingExtends.trimEnd().endsWith(',')
        const newEntry = hasTrailingComma
          ? `\n    '${packageName}'`
          : `,\n    '${packageName}'`
        newExtends = existingExtends + newEntry
      }

      content = content.replace(extendsMatch[0], `extends: [${newExtends}\n  ]`)
    } else {
      // Empty extends array
      content = content.replace(extendsMatch[0], `extends: [\n    '${packageName}'\n  ]`)
    }

    await fs.writeFile(configPath, content, 'utf-8')
    return { added: true }
  }

  // No extends array found - try to add one after defineNuxtConfig({
  const defineNuxtConfigMatch = content.match(/(defineNuxtConfig\s*\(\s*\{)/)

  if (defineNuxtConfigMatch) {
    const insertPoint = defineNuxtConfigMatch.index + defineNuxtConfigMatch[0].length
    const extendsBlock = `\n  extends: [\n    '${packageName}'\n  ],`

    content = content.slice(0, insertPoint) + extendsBlock + content.slice(insertPoint)

    await fs.writeFile(configPath, content, 'utf-8')
    return { added: true }
  }

  return { added: false, reason: 'could not parse nuxt.config.ts' }
}

/**
 * Check if a package is already in nuxt.config.ts extends
 * @param {string} configPath - Path to nuxt.config.ts
 * @param {string} packageName - Package name to check
 * @returns {Promise<boolean>}
 */
export async function isInNuxtConfigExtends(configPath, packageName) {
  if (!await fs.pathExists(configPath)) {
    return false
  }

  const content = await fs.readFile(configPath, 'utf-8')
  return content.includes(packageName)
}

/**
 * Sync framework packages in nuxt.config.ts based on features
 * - Removes getCroutonLayers() import and usage if present
 * - Adds framework packages based on features config
 * @param {string} configPath - Path to nuxt.config.ts
 * @param {object} features - Features config object
 * @returns {Promise<{synced: boolean, packages?: string[], reason?: string}>}
 */
export async function syncFrameworkPackages(configPath, features = {}) {
  if (!await fs.pathExists(configPath)) {
    return { synced: false, reason: 'nuxt.config.ts not found' }
  }

  let content = await fs.readFile(configPath, 'utf-8')
  let modified = false

  // Remove getCroutonLayers() import if present
  const importRegex = /import\s*\{\s*getCroutonLayers\s*\}\s*from\s*['"]@fyit\/crouton['"]\s*\n?/g
  if (importRegex.test(content)) {
    content = content.replace(importRegex, '')
    modified = true
  }

  // Remove ...getCroutonLayers() spread if present (with various spacing/argument patterns)
  const spreadRegex = /\.\.\.getCroutonLayers\([^)]*\),?\s*/g
  if (spreadRegex.test(content)) {
    content = content.replace(spreadRegex, '')
    modified = true
  }

  // Write back if we removed getCroutonLayers usage
  if (modified) {
    await fs.writeFile(configPath, content, 'utf-8')
  }

  // Get framework packages based on features
  const packages = getFrameworkPackages(features)

  // Add each package to extends (reuses existing function, handles deduplication)
  for (const pkg of packages) {
    await addToNuxtConfigExtends(configPath, pkg)
  }

  return { synced: true, packages }
}
