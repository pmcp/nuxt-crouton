/**
 * Auto-merge package manifest collections into CLI generation config.
 *
 * When `config.features` enables a package (e.g., `bookings: true`), this
 * utility adds the package's collections to `config.collections` and
 * `config.targets` so the generator creates the missing CRUD routes.
 *
 * User-defined collections always win — we never overwrite them.
 */

import path from 'node:path'
import fsp from 'node:fs/promises'

// ---------------------------------------------------------------------------
// Static manifest map
// ---------------------------------------------------------------------------
// Collection names use the *plural config-style* names that match what
// crouton.config.js expects (e.g., "emailtemplates", not "emailtemplate").
// schemaFile paths are relative to the package directory.
// ---------------------------------------------------------------------------

const PACKAGE_MANIFESTS = {
  bookings: {
    packageDir: 'crouton-bookings',
    layer: 'bookings',
    collections: [
      { name: 'bookings', schemaFile: 'schemas/booking.json' },
      { name: 'locations', schemaFile: 'schemas/location.json' },
      { name: 'settings', schemaFile: 'schemas/settings.json' },
      { name: 'emailtemplates', schemaFile: 'schemas/email-template.json', optional: true, condition: 'email.enabled' },
      { name: 'emaillogs', schemaFile: 'schemas/email-log.json', optional: true, condition: 'email.enabled' }
    ]
  },
  sales: {
    packageDir: 'crouton-sales',
    layer: 'sales',
    collections: [
      { name: 'events', schemaFile: 'schemas/events.json' },
      { name: 'products', schemaFile: 'schemas/products.json' },
      { name: 'categories', schemaFile: 'schemas/categories.json' },
      { name: 'orders', schemaFile: 'schemas/orders.json' },
      { name: 'orderitems', schemaFile: 'schemas/orderItems.json' },
      { name: 'locations', schemaFile: 'schemas/locations.json' },
      { name: 'clients', schemaFile: 'schemas/clients.json' },
      { name: 'eventsettings', schemaFile: 'schemas/eventSettings.json' },
      { name: 'printers', schemaFile: 'schemas/printers.json', optional: true, condition: 'print.enabled' },
      { name: 'printqueues', schemaFile: 'schemas/printQueues.json', optional: true, condition: 'print.enabled' }
    ]
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Walk up from cwd to find the monorepo `packages/` directory.
 * Looks for pnpm-workspace.yaml as the root marker.
 */
async function findPackagesDir() {
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
function getNestedValue(obj, dotPath) {
  return dotPath.split('.').reduce((acc, key) => acc?.[key], obj)
}

/**
 * Check whether an optional collection's condition is met.
 *
 * `condition` is a dot-path like "email.enabled" evaluated against the
 * feature config object (e.g., `config.features.bookings`).
 */
function isConditionMet(featureConfig, condition) {
  if (!condition) return true
  // featureConfig can be `true` (simple boolean enable) — conditions never match
  if (typeof featureConfig !== 'object') return false
  return !!getNestedValue(featureConfig, condition)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Mutate `config.collections` and `config.targets` in place, adding any
 * package-manifest collections that the user hasn't already listed.
 *
 * @param {object} config — the full crouton config object
 * @returns {{ merged: number, collections: Array, skipped: string[] }}
 */
export async function mergeManifestCollections(config) {
  const result = { merged: 0, collections: [], skipped: [] }

  if (!config.features) return result

  const packagesDir = await findPackagesDir()
  if (!packagesDir) return result

  // Build a set of collection names the user already has
  const existingNames = new Set(
    (config.collections || []).map(c => c.name)
  )

  // Ensure arrays exist
  if (!config.collections) config.collections = []
  if (!config.targets) config.targets = []

  for (const [featureKey, manifest] of Object.entries(PACKAGE_MANIFESTS)) {
    const featureConfig = config.features[featureKey]
    if (!featureConfig) continue // feature not enabled

    const pkgDir = path.join(packagesDir, manifest.packageDir)

    // Find or create the target entry for this layer
    let target = config.targets.find(t => t.layer === manifest.layer)
    if (!target) {
      target = { layer: manifest.layer, collections: [] }
      config.targets.push(target)
    }

    for (const col of manifest.collections) {
      // Skip collections the user already defined (user override wins)
      if (existingNames.has(col.name)) {
        // Also ensure it's in the target's collections list
        if (!target.collections.includes(col.name)) {
          target.collections.push(col.name)
        }
        result.skipped.push(col.name)
        continue
      }

      // Skip optional collections whose condition isn't met
      if (col.optional && !isConditionMet(featureConfig, col.condition)) {
        continue
      }

      // Resolve absolute path to schema file
      const absSchemaPath = path.join(pkgDir, col.schemaFile)

      // Verify the schema file exists
      try {
        await fsp.access(absSchemaPath)
      } catch {
        // Schema file doesn't exist — skip silently
        continue
      }

      // Add to config.collections with absolute path
      config.collections.push({
        name: col.name,
        fieldsFile: absSchemaPath
      })

      // Add to target's collections list
      if (!target.collections.includes(col.name)) {
        target.collections.push(col.name)
      }

      result.merged++
      result.collections.push({
        name: col.name,
        layer: manifest.layer,
        feature: featureKey
      })
    }
  }

  return result
}
