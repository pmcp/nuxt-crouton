/**
 * Connector Detection Utility
 *
 * Scans schemas for external collection references (e.g., :users, :teams)
 * and detects which connectors are needed
 */

import fsp from 'fs/promises'
import path from 'path'

/**
 * Detect external collection references in schemas
 *
 * @param {string} schemaPath - Path to schema file or directory
 * @returns {Promise<Map<string, Set<string>>>} Map of external collection -> collections that use it
 */
export async function detectExternalReferences(schemaPath) {
  const externalRefs = new Map() // externalCollection -> Set of collections using it

  async function scanSchema(filePath, collectionName) {
    try {
      const content = await fsp.readFile(filePath, 'utf-8')
      const schema = JSON.parse(content)

      for (const [fieldName, fieldDef] of Object.entries(schema)) {
        if (fieldDef.refTarget && fieldDef.refTarget.startsWith(':')) {
          const externalCollection = fieldDef.refTarget.substring(1) // Remove :

          if (!externalRefs.has(externalCollection)) {
            externalRefs.set(externalCollection, new Set())
          }
          externalRefs.get(externalCollection).add(collectionName)
        }
      }
    } catch (error) {
      console.warn(`⚠ Could not scan schema ${filePath}:`, error.message)
    }
  }

  // Check if schemaPath is file or directory
  const stats = await fsp.stat(schemaPath)

  if (stats.isDirectory()) {
    // Scan all JSON files in directory
    const files = await fsp.readdir(schemaPath)
    for (const file of files) {
      if (file.endsWith('-schema.json')) {
        const collectionName = file.replace('-schema.json', '')
        await scanSchema(path.join(schemaPath, file), collectionName)
      }
    }
  } else {
    // Single schema file
    const collectionName = path.basename(schemaPath, '-schema.json')
    await scanSchema(schemaPath, collectionName)
  }

  return externalRefs
}

/**
 * Get connector type recommendations based on collection name
 *
 * @param {string} collectionName - Name of external collection
 * @returns {{type: string, confidence: string, description: string}[]}
 */
export function getConnectorRecommendations(collectionName) {
  const recommendations = []

  // Common patterns
  if (collectionName === 'users' || collectionName === 'user') {
    recommendations.push(
      {
        type: 'supersaas',
        confidence: 'high',
        description: 'SuperSaaS (team-based user management)'
      },
      {
        type: 'supabase',
        confidence: 'medium',
        description: 'Supabase (auth.users table)'
      },
      {
        type: 'clerk',
        confidence: 'medium',
        description: 'Clerk (hosted auth)'
      }
    )
  } else if (collectionName === 'teams' || collectionName === 'organizations') {
    recommendations.push(
      {
        type: 'supersaas',
        confidence: 'high',
        description: 'SuperSaaS (team management)'
      }
    )
  } else {
    recommendations.push(
      {
        type: 'custom',
        confidence: 'low',
        description: 'Custom connector (requires manual setup)'
      }
    )
  }

  return recommendations
}

/**
 * Check if connector package is installed
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>}
 */
export async function isConnectorPackageInstalled(projectRoot) {
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json')
    const content = await fsp.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }

    return '@friendlyinternet/nuxt-crouton-connector' in deps
  } catch {
    return false
  }
}

/**
 * Format external references for display
 *
 * @param {Map<string, Set<string>>} externalRefs
 * @returns {string}
 */
export function formatExternalReferences(externalRefs) {
  const lines = []

  for (const [externalCollection, collections] of externalRefs) {
    const collectionsStr = Array.from(collections).join(', ')
    const count = collections.size
    lines.push(
      `  • :${externalCollection} (used in ${count} collection${count > 1 ? 's' : ''}: ${collectionsStr})`
    )
  }

  return lines.join('\n')
}
