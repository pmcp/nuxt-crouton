/**
 * Auto-merge package manifest collections into CLI generation config.
 *
 * When `config.features` enables a package (e.g., `bookings: true`), this
 * utility reads the package's crouton.manifest.ts and adds its collections
 * to `config.collections` and `config.targets` so the generator creates
 * the missing CRUD routes.
 *
 * User-defined collections always win — we never overwrite them.
 */

import path from 'node:path'
import fsp from 'node:fs/promises'
import { discoverManifests } from './manifest-bridge.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionConfig {
  name: string
  fieldsFile: string
  [key: string]: unknown
}

interface TargetConfig {
  layer: string
  collections: string[]
}

interface CroutonConfig {
  features?: Record<string, boolean | Record<string, unknown>>
  collections?: CollectionConfig[]
  targets?: TargetConfig[]
  [key: string]: unknown
}

interface ManifestCollection {
  name: string
  schemaPath?: string
  optional?: boolean
  condition?: string
}

interface Manifest {
  id: string
  layer?: { name: string }
  collections?: ManifestCollection[]
}

interface MergeResult {
  merged: number
  collections: Array<{ name: string; layer: string; feature: string }>
  skipped: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Walk up from cwd to find the monorepo `packages/` directory.
 * Looks for pnpm-workspace.yaml as the root marker.
 */
async function findPackagesDir(): Promise<string | null> {
  let dir = process.cwd()
  const root = path.parse(dir).root

  while (dir !== root) {
    try {
      await fsp.access(path.join(dir, 'pnpm-workspace.yaml'))
      const packagesDir = path.join(dir, 'packages')
      await fsp.access(packagesDir)
      return packagesDir
    } catch { /* keep walking */ }
    dir = path.dirname(dir)
  }
  return null
}

/**
 * Resolve a dot-path like "email.enabled" against an object.
 * Returns `undefined` if any segment is missing.
 */
function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
  return dotPath.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

/**
 * Check whether an optional collection's condition is met.
 *
 * `condition` is a dot-path like "config.email.enabled" evaluated against the
 * feature config object (e.g., `config.features.bookings`).
 */
function isConditionMet(featureConfig: boolean | Record<string, unknown>, condition?: string): boolean {
  if (!condition) return true
  // featureConfig can be `true` (simple boolean enable) — conditions never match
  if (typeof featureConfig !== 'object') return false
  return !!getNestedValue(featureConfig, condition)
}

/**
 * Naive pluralize: add 's' if not already ending in 's'.
 * Used for config-style collection names.
 */
function pluralize(name: string): string {
  return name.endsWith('s') ? name : name + 's'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Mutate `config.collections` and `config.targets` in place, adding any
 * package-manifest collections that the user hasn't already listed.
 */
export async function mergeManifestCollections(config: CroutonConfig): Promise<MergeResult> {
  const result: MergeResult = { merged: 0, collections: [], skipped: [] }

  if (!config.features) return result

  const packagesDir = await findPackagesDir()
  if (!packagesDir) return result

  // Discover all manifests
  const manifests: Manifest[] = await discoverManifests()

  // Build a set of collection names the user already has
  const existingNames = new Set(
    (config.collections || []).map(c => c.name),
  )

  // Ensure arrays exist
  if (!config.collections) config.collections = []
  if (!config.targets) config.targets = []

  for (const manifest of manifests) {
    if (!manifest.collections || manifest.collections.length === 0) continue

    // Derive feature alias from manifest id (e.g., 'crouton-bookings' → 'bookings')
    const featureKey = manifest.id.replace(/^crouton-/, '')
    const featureConfig = config.features[featureKey]
    if (!featureConfig) continue // feature not enabled

    // Resolve package directory
    const pkgDir = path.join(packagesDir, manifest.id)

    // Get layer name from manifest
    const layerName = manifest.layer?.name || featureKey

    // Find or create the target entry for this layer
    let target = config.targets.find(t => t.layer === layerName)
    if (!target) {
      target = { layer: layerName, collections: [] }
      config.targets.push(target)
    }

    for (const col of manifest.collections) {
      // Use pluralized lowercase name for config compatibility
      const configName = pluralize(col.name.toLowerCase())

      // Skip collections the user already defined (user override wins)
      // Check both singular and plural forms
      if (existingNames.has(configName) || existingNames.has(col.name)) {
        const matchedName = existingNames.has(configName) ? configName : col.name
        if (!target.collections.includes(matchedName)) {
          target.collections.push(matchedName)
        }
        result.skipped.push(matchedName)
        continue
      }

      // Skip optional collections whose condition isn't met
      if (col.optional && !isConditionMet(featureConfig, col.condition)) {
        continue
      }

      // Resolve absolute path to schema file
      if (!col.schemaPath) continue
      const absSchemaPath = path.resolve(pkgDir, col.schemaPath)

      // Verify the schema file exists
      try {
        await fsp.access(absSchemaPath)
      } catch {
        // Schema file doesn't exist — skip silently
        continue
      }

      // Add to config.collections with absolute path
      config.collections.push({
        name: configName,
        fieldsFile: absSchemaPath,
      })

      // Add to target's collections list
      if (!target.collections.includes(configName)) {
        target.collections.push(configName)
      }

      result.merged++
      result.collections.push({
        name: configName,
        layer: layerName,
        feature: featureKey,
      })
    }
  }

  return result
}
