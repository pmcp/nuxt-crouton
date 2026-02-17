// Update server/db/schema.ts — add/remove schema exports using magicast
// Replaces regex-based export detection and string append

import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseModule, generateCode } from 'magicast'

// Default content for new schema index files
const DEFAULT_SCHEMA_CONTENT = `// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package
export * from '@fyit/crouton-auth/server/database/schema/auth'
`

async function pathExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Find re-export declarations in the AST that match a given source path pattern.
 */
function findExportBySource(mod, pattern) {
  const program = mod.$ast.program || mod.$ast.body
  const body = program?.body || []
  for (const node of body) {
    if (
      (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') &&
      node.source?.value &&
      String(node.source.value).includes(pattern)
    ) {
      return node
    }
  }
  return null
}

/**
 * Find a named re-export by export name.
 */
function findExportByName(mod, exportName) {
  const program = mod.$ast.program || mod.$ast.body
  const body = program?.body || []
  for (const node of body) {
    if (node.type === 'ExportNamedDeclaration' && node.specifiers) {
      for (const spec of node.specifiers) {
        if (
          spec.type === 'ExportSpecifier' &&
          (spec.exported?.name === exportName || spec.local?.name === exportName)
        ) {
          return node
        }
      }
    }
  }
  return null
}

/**
 * Add a wildcard re-export: `export * from 'path'`
 * Used by `crouton add` to wire up module schemas.
 * @param {string} schemaPath - Path to schema index file
 * @param {string} exportPath - Import path to add
 * @returns {Promise<{added: boolean, reason?: string, created?: boolean}>}
 */
export async function addSchemaExport(schemaPath, exportPath) {
  const fileExist = await pathExists(schemaPath)

  let content
  let created = false

  if (!fileExist) {
    await mkdir(dirname(schemaPath), { recursive: true })
    content = DEFAULT_SCHEMA_CONTENT
    created = true
  } else {
    content = await readFile(schemaPath, 'utf-8')
  }

  // Check if already exists
  if (content.includes(exportPath)) {
    return { added: false, reason: 'already exported' }
  }

  // Append the export line
  content = content.trimEnd() + '\n' + `export * from '${exportPath}'` + '\n'

  await writeFile(schemaPath, content, 'utf-8')
  return { added: true, created }
}

/**
 * Add a named re-export: `export { Name } from 'path'`
 * Used by `crouton generate` for collection schemas.
 * @param {string} schemaPath - Path to schema index file
 * @param {string} exportName - Named export identifier
 * @param {string} importPath - Module path to import from
 * @param {boolean} [force=false] - Override conflicting exports
 * @returns {Promise<{added: boolean, reason?: string, created?: boolean}>}
 */
export async function addNamedSchemaExport(schemaPath, exportName, importPath, force = false) {
  const fileExist = await pathExists(schemaPath)

  let content
  let created = false

  if (!fileExist) {
    await mkdir(dirname(schemaPath), { recursive: true })
    content = DEFAULT_SCHEMA_CONTENT
    created = true
  } else {
    content = await readFile(schemaPath, 'utf-8')
  }

  try {
    const mod = parseModule(content)

    // Check for conflicting export (same name from different source)
    const existingByName = findExportByName(mod, exportName)
    if (existingByName && !force) {
      const existingSource = existingByName.source?.value || 'unknown'
      if (!String(existingSource).includes(importPath.split('/collections/')[1] || importPath)) {
        return {
          added: false,
          reason: `conflicting export "${exportName}" from "${existingSource}"`
        }
      }
    }

    // Check if exact export already exists
    const existingBySource = findExportBySource(mod, importPath)
    if (existingBySource) {
      return { added: false, reason: 'already exported' }
    }

    // Append the named export line
    content = content.trimEnd() + '\n' + `export { ${exportName} } from '${importPath}'` + '\n'

    await writeFile(schemaPath, content, 'utf-8')
    return { added: true, created }
  } catch {
    // Fallback: simple string append if AST parsing fails
    content = content.trimEnd() + '\n' + `export { ${exportName} } from '${importPath}'` + '\n'
    await writeFile(schemaPath, content, 'utf-8')
    return { added: true, created }
  }
}

/**
 * Remove a schema export matching a pattern.
 * Used by rollback to clean up schema index.
 * @param {string} schemaPath - Path to schema index file
 * @param {string} pattern - Pattern to match in export source
 * @returns {Promise<{removed: boolean, reason?: string}>}
 */
export async function removeSchemaExport(schemaPath, pattern) {
  if (!await pathExists(schemaPath)) {
    return { removed: false, reason: 'schema index not found' }
  }

  const content = await readFile(schemaPath, 'utf-8')

  if (!content.includes(pattern)) {
    return { removed: false, reason: 'export not found' }
  }

  try {
    const mod = parseModule(content)
    const node = findExportBySource(mod, pattern) || findExportByName(mod, pattern)

    if (!node) {
      return { removed: false, reason: 'export not found in AST' }
    }

    // Remove the node from the program body
    const body = mod.$ast.program?.body || mod.$ast.body || []
    const index = body.indexOf(node)
    if (index !== -1) {
      body.splice(index, 1)
    }

    const result = generateCode(mod)
    await writeFile(schemaPath, result.code, 'utf-8')
    return { removed: true }
  } catch {
    // Fallback: line-based removal
    const lines = content.split('\n')
    const filtered = lines.filter(line => !line.includes(pattern))
    await writeFile(schemaPath, filtered.join('\n'), 'utf-8')
    return { removed: true }
  }
}

/**
 * Check if a schema export already exists.
 * @param {string} schemaPath - Path to schema index file
 * @param {string} exportPath - Import path to check
 * @returns {Promise<boolean>}
 */
export async function hasSchemaExport(schemaPath, exportPath) {
  if (!await pathExists(schemaPath)) {
    return false
  }
  const content = await readFile(schemaPath, 'utf-8')
  return content.includes(exportPath)
}

/**
 * Get the schema index path, checking common locations.
 * @param {string} [cwd] - Working directory
 * @returns {Promise<string>}
 */
export async function getSchemaPath(cwd = process.cwd()) {
  const locations = [
    'server/db/schema.ts',
    'server/database/schema.ts',
    'server/database/schema/index.ts'
  ]

  for (const loc of locations) {
    const fullPath = `${cwd}/${loc}`
    if (await pathExists(fullPath)) {
      return fullPath
    }
  }

  return `${cwd}/${locations[0]}`
}
