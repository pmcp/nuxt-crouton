/**
 * Manifest Loader
 *
 * Discovers and loads crouton.manifest.ts files from all packages.
 * Builds a unified field type registry with alias expansion.
 *
 * Used by: CLI generators, MCP server, crouton-core Nuxt module hook
 */

import { createJiti } from 'jiti'
import { resolve, join, dirname } from 'pathe'
import { readPackageJSON } from 'pkg-types'
import type {
  CroutonManifest,
  FieldTypeDefinition,
} from '@fyit/crouton-core/shared/manifest'
import { existsSync, readdirSync } from 'node:fs'

// Re-export types for consumers
export type { CroutonManifest, FieldTypeDefinition }

/** AI-facing summary of what a package provides */
export interface ModuleAIContext {
  collections?: Array<{ name: string, description: string }>
  composables?: string[]
  components?: string[]
}

/** Module registry entry shape (backward compat with module-registry.json) */
export interface ModuleRegistryEntry {
  alias: string
  package: string
  description: string
  hasSchema: boolean
  bundled: boolean
  aiHint: string | null
  dependencies: string[]
  category: 'core' | 'addon' | 'miniapp'
  ai?: ModuleAIContext
}

// Cache to avoid repeated filesystem scanning
let _manifestCache: CroutonManifest[] | null = null
let _cacheRootDir: string | null = null

/**
 * Discover and load all crouton.manifest.ts files.
 *
 * Discovery order:
 * 1. packages/crouton-* /crouton.manifest.ts (monorepo dev)
 * 2. node_modules/@fyit/crouton-* /crouton.manifest.ts (installed deps)
 */
export async function discoverManifests(rootDir?: string): Promise<CroutonManifest[]> {
  const cwd = rootDir || process.cwd()

  // Return cache if same rootDir
  if (_manifestCache && _cacheRootDir === cwd) {
    return _manifestCache
  }

  const manifests: CroutonManifest[] = []
  const seen = new Set<string>()

  const jiti = createJiti(cwd, {
    interopDefault: true,
  })

  // Strategy 1: Monorepo packages/ directory
  const packagesDir = await findPackagesDir(cwd)
  if (packagesDir) {
    const dirs = readdirSync(packagesDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('crouton-'))
      .map(d => join(packagesDir, d.name))

    for (const dir of dirs) {
      const manifestPath = join(dir, 'crouton.manifest.ts')
      if (existsSync(manifestPath)) {
        try {
          const mod = await jiti.import(manifestPath)
          const manifest = (mod as any).default || mod
          if (manifest?.id && !seen.has(manifest.id)) {
            seen.add(manifest.id)
            manifests.push(manifest)
          }
        } catch (err) {
          // Skip manifests that fail to load (e.g., missing schema JSON imports)
          if (process.env.DEBUG) {
            console.warn(`[manifest-loader] Failed to load ${manifestPath}:`, err)
          }
        }
      }
    }
  }

  // Strategy 2: node_modules/@fyit/crouton-*
  const nodeModulesDir = join(cwd, 'node_modules', '@fyit')
  if (existsSync(nodeModulesDir)) {
    const dirs = readdirSync(nodeModulesDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('crouton-'))
      .map(d => join(nodeModulesDir, d.name))

    for (const dir of dirs) {
      const manifestPath = join(dir, 'crouton.manifest.ts')
      if (existsSync(manifestPath)) {
        try {
          const mod = await jiti.import(manifestPath)
          const manifest = (mod as any).default || mod
          if (manifest?.id && !seen.has(manifest.id)) {
            seen.add(manifest.id)
            manifests.push(manifest)
          }
        } catch {
          // Skip silently — installed packages may not have all deps
        }
      }
    }
  }

  _manifestCache = manifests
  _cacheRootDir = cwd
  return manifests
}

/**
 * Clear the manifest cache (useful for tests or after config changes)
 */
export function clearManifestCache(): void {
  _manifestCache = null
  _cacheRootDir = null
}

/**
 * Build a flat field type registry from all manifests.
 * Aliases are expanded — both 'number' and 'integer' keys exist.
 */
export function getFieldTypeRegistry(
  manifests: CroutonManifest[],
): Record<string, FieldTypeDefinition> {
  const registry: Record<string, FieldTypeDefinition> = {}

  for (const manifest of manifests) {
    if (!manifest.fieldTypes) continue
    for (const [name, def] of Object.entries(manifest.fieldTypes)) {
      // Canonical type
      registry[name] = def

      // Expand aliases
      if (def.aliases) {
        for (const alias of def.aliases) {
          registry[alias] = def
        }
      }
    }
  }

  return registry
}

/**
 * Get the list of valid canonical field type names (no aliases).
 */
export function getCanonicalFieldTypes(
  manifests: CroutonManifest[],
): string[] {
  const types: string[] = []
  for (const manifest of manifests) {
    if (!manifest.fieldTypes) continue
    types.push(...Object.keys(manifest.fieldTypes))
  }
  return types
}

/**
 * Get all auto-generated fields merged from all manifests.
 */
export function getAutoGeneratedFields(
  manifests: CroutonManifest[],
): string[] {
  const fields = new Set<string>()
  for (const manifest of manifests) {
    if (manifest.autoGeneratedFields) {
      for (const f of manifest.autoGeneratedFields) {
        fields.add(f)
      }
    }
  }
  return [...fields]
}

/**
 * Get all reserved field names merged from all manifests.
 */
export function getReservedFieldNames(
  manifests: CroutonManifest[],
): string[] {
  const names = new Set<string>()
  for (const manifest of manifests) {
    if (manifest.reservedFieldNames) {
      for (const n of manifest.reservedFieldNames) {
        names.add(n)
      }
    }
  }
  return [...names]
}

/**
 * Get all reserved collection names merged from all manifests.
 */
export function getReservedCollectionNames(
  manifests: CroutonManifest[],
): string[] {
  const names = new Set<string>()
  for (const manifest of manifests) {
    if (manifest.reservedCollectionNames) {
      for (const n of manifest.reservedCollectionNames) {
        names.add(n)
      }
    }
  }
  return [...names]
}

/**
 * Build a module registry from manifests (backward compat shape).
 */
export function getModuleRegistry(
  manifests: CroutonManifest[],
): ModuleRegistryEntry[] {
  return manifests.map((m) => {
    const alias = m.id.replace(/^crouton-/, '')

    // Build AI-facing context from manifest data
    const hasAIData = m.collections?.length || m.provides?.composables?.length || m.provides?.components?.length
    const ai: ModuleAIContext | undefined = hasAIData
      ? {
          collections: m.collections?.filter(c => !c.optional).map(c => ({ name: c.name, description: c.description })),
          composables: m.provides?.composables,
          components: m.provides?.components?.map(c => c.name),
        }
      : undefined

    return {
      alias,
      package: `@fyit/${m.id}`,
      description: m.description,
      hasSchema: (m.collections?.length ?? 0) > 0,
      bundled: m.bundled ?? false,
      aiHint: m.aiHint ?? null,
      dependencies: m.dependencies ?? [],
      category: m.category,
      ai,
    }
  })
}

/**
 * Get module registry as a Record keyed by alias (matches old JSON shape).
 */
export function getModuleRegistryMap(
  manifests: CroutonManifest[],
): Record<string, ModuleRegistryEntry> {
  const map: Record<string, ModuleRegistryEntry> = {}
  for (const entry of getModuleRegistry(manifests)) {
    map[entry.alias] = entry
  }
  return map
}

/**
 * Build a type mapping compatible with helpers.ts typeMapping shape.
 * Used by generate-collection.mjs during code generation.
 */
export function getTypeMapping(
  manifests: CroutonManifest[],
): Record<string, { db: string; drizzle: string; zod: string; default: string; tsType: string }> {
  const registry = getFieldTypeRegistry(manifests)
  const mapping: Record<string, { db: string; drizzle: string; zod: string; default: string; tsType: string }> = {}

  for (const [name, def] of Object.entries(registry)) {
    mapping[name] = {
      db: def.db,
      drizzle: def.drizzle,
      zod: def.zod,
      default: def.defaultValue,
      tsType: def.tsType,
    }
  }

  return mapping
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Walk up from cwd to find the monorepo packages/ directory.
 * Looks for pnpm-workspace.yaml as the root marker.
 */
async function findPackagesDir(startDir: string): Promise<string | null> {
  let dir = resolve(startDir)
  const root = dirname(dir) === dir ? dir : '/' // filesystem root

  while (dir !== root) {
    const workspacePath = join(dir, 'pnpm-workspace.yaml')
    const packagesPath = join(dir, 'packages')

    if (existsSync(workspacePath) && existsSync(packagesPath)) {
      return packagesPath
    }

    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return null
}
