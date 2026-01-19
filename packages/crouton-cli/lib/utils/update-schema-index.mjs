// Update server/db/schema.ts to add schema exports

import fs from 'fs-extra'
import { dirname } from 'node:path'

// Default schema index content
const DEFAULT_SCHEMA_CONTENT = `// Database schema exports
// This file re-exports schemas from all installed crouton modules

`

/**
 * Add a schema export to the schema index file
 * @param {string} schemaPath - Path to schema index file (e.g., server/db/schema.ts)
 * @param {string} exportPath - Import path to add (e.g., '@friendlyinternet/nuxt-crouton-auth/server/database/schema/auth')
 * @returns {Promise<{added: boolean, reason?: string, created?: boolean}>}
 */
export async function addSchemaExport(schemaPath, exportPath) {
  // Check if file exists
  const fileExists = await fs.pathExists(schemaPath)

  let content
  let created = false

  if (!fileExists) {
    // Create directory if needed
    await fs.ensureDir(dirname(schemaPath))

    // Create with default content
    content = DEFAULT_SCHEMA_CONTENT
    created = true
  } else {
    content = await fs.readFile(schemaPath, 'utf-8')
  }

  // Check if already exists
  if (content.includes(exportPath)) {
    return { added: false, reason: 'already exported' }
  }

  // Build the export line
  const exportLine = `export * from '${exportPath}'`

  // Add at end of file, ensuring proper newlines
  content = content.trimEnd() + '\n' + exportLine + '\n'

  await fs.writeFile(schemaPath, content, 'utf-8')
  return { added: true, created }
}

/**
 * Check if a schema export already exists
 * @param {string} schemaPath - Path to schema index file
 * @param {string} exportPath - Import path to check
 * @returns {Promise<boolean>}
 */
export async function hasSchemaExport(schemaPath, exportPath) {
  if (!await fs.pathExists(schemaPath)) {
    return false
  }

  const content = await fs.readFile(schemaPath, 'utf-8')
  return content.includes(exportPath)
}

/**
 * Get the default schema path, checking common locations
 * @param {string} [cwd] - Working directory
 * @returns {Promise<string>}
 */
export async function getSchemaPath(cwd = process.cwd()) {
  // Check common locations in order of preference
  const locations = [
    'server/db/schema.ts',
    'server/database/schema.ts',
    'server/database/schema/index.ts'
  ]

  for (const loc of locations) {
    const fullPath = `${cwd}/${loc}`
    if (await fs.pathExists(fullPath)) {
      return fullPath
    }
  }

  // Default to first option if none exist
  return `${cwd}/${locations[0]}`
}
