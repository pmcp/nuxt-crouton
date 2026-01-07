// Update nuxt.config.ts to add a package to the extends array

import fs from 'fs-extra'

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
      // Has existing entries
      const hasTrailingComma = existingExtends.trimEnd().endsWith(',')
      const newEntry = hasTrailingComma
        ? `\n    '${packageName}',`
        : `,\n    '${packageName}'`

      const newExtends = existingExtends + newEntry
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
