/**
 * Package Registry Utility
 *
 * Discovers and loads crouton package manifests from the workspace.
 * These manifests define collections, configuration options, and extension points.
 */

import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PackageManifest, PackageSummary } from '../../app/types/package-manifest'
import { toPackageSummary } from '../../app/types/package-manifest'

// Known packages in workspace that may have manifests
const WORKSPACE_PACKAGES = [
  'crouton-bookings',
  'crouton-sales',
]

// Cache for loaded manifests
let manifestCache: Map<string, PackageManifest> | null = null
let lastCacheTime = 0
const CACHE_TTL = 60_000 // 1 minute cache

/**
 * Find the monorepo packages directory
 */
function findPackagesDir(): string | null {
  const __dirname = dirname(fileURLToPath(import.meta.url))

  const possibleRoots = [
    process.cwd(),
    join(process.cwd(), '../..'), // From apps/*
    join(__dirname, '../../../..') // From packages/nuxt-crouton-schema-designer/server/utils
  ]

  for (const root of possibleRoots) {
    const packagesDir = join(root, 'packages')
    const workspaceFile = join(root, 'pnpm-workspace.yaml')

    if (existsSync(workspaceFile) && existsSync(packagesDir)) {
      return packagesDir
    }
  }

  return null
}

/**
 * Load a single package manifest by package name
 */
async function loadManifestFromDisk(packageName: string): Promise<PackageManifest | null> {
  const packagesDir = findPackagesDir()
  if (!packagesDir) return null

  const manifestPath = join(packagesDir, packageName, 'crouton.manifest.ts')

  if (!existsSync(manifestPath)) {
    console.warn(`No manifest found for ${packageName} at ${manifestPath}`)
    return null
  }

  try {
    // Dynamic import of the manifest file
    // Note: In production, this may need to be compiled first
    const module = await import(/* @vite-ignore */ manifestPath)
    return module.default as PackageManifest
  } catch (error) {
    console.error(`Failed to load manifest for ${packageName}:`, error)
    return null
  }
}

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  return manifestCache !== null && (Date.now() - lastCacheTime) < CACHE_TTL
}

/**
 * Clear the manifest cache (useful for development)
 */
export function clearPackageCache(): void {
  manifestCache = null
  lastCacheTime = 0
}

/**
 * Load all package manifests from workspace packages.
 * Results are cached for performance.
 */
export async function loadPackageManifests(): Promise<PackageManifest[]> {
  // Return from cache if valid
  if (isCacheValid() && manifestCache) {
    return Array.from(manifestCache.values())
  }

  manifestCache = new Map()
  lastCacheTime = Date.now()

  const loadPromises = WORKSPACE_PACKAGES.map(async (packageName) => {
    const manifest = await loadManifestFromDisk(packageName)
    if (manifest) {
      manifestCache!.set(manifest.id, manifest)
    }
  })

  await Promise.all(loadPromises)

  return Array.from(manifestCache.values())
}

/**
 * Load a single package manifest by ID.
 */
export async function loadPackageManifest(id: string): Promise<PackageManifest | null> {
  // Check cache first
  if (isCacheValid() && manifestCache?.has(id)) {
    return manifestCache.get(id) || null
  }

  // If not in cache, try to find the package
  // The ID format is typically the package name (e.g., 'crouton-bookings')
  const packageName = WORKSPACE_PACKAGES.find(pkg =>
    pkg === id || pkg.replace('nuxt-', '') === id
  )

  if (!packageName) {
    return null
  }

  const manifest = await loadManifestFromDisk(packageName)

  // Update cache
  if (manifest) {
    if (!manifestCache) {
      manifestCache = new Map()
      lastCacheTime = Date.now()
    }
    manifestCache.set(manifest.id, manifest)
  }

  return manifest
}

/**
 * Get package summaries (lightweight for list views).
 */
export async function getPackageSummaries(): Promise<PackageSummary[]> {
  const manifests = await loadPackageManifests()
  return manifests.map(toPackageSummary)
}

/**
 * Check if a package is available in the workspace.
 */
export async function isPackageAvailable(id: string): Promise<boolean> {
  const manifest = await loadPackageManifest(id)
  return manifest !== null
}
