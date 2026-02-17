import { defineNuxtModule, createResolver, resolvePath } from '@nuxt/kit'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import type { CroutonOptions, CroutonConfig } from './types'

export type { CroutonOptions, CroutonConfig }

// ---------------------------------------------------------------------------
// Manifest metadata scanner (sync, lightweight — no jiti needed)
// Source of truth: each package's crouton.manifest.ts
// ---------------------------------------------------------------------------

interface ManifestMeta {
  id: string
  bundled: boolean
  category: 'core' | 'addon' | 'miniapp'
}

/**
 * Extract id, bundled, and category from a manifest file using regex.
 * Avoids full TS evaluation — only reads the fields we need.
 */
function scanManifestMeta(filePath: string): ManifestMeta | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/)
    if (!idMatch) return null

    const categoryMatch = content.match(/category:\s*['"](\w+)['"]/)

    return {
      id: idMatch[1],
      bundled: /bundled:\s*true/.test(content),
      category: (categoryMatch?.[1] as ManifestMeta['category']) || 'addon',
    }
  } catch {
    return null
  }
}

/**
 * Discover manifest metadata from all crouton packages.
 * Scans monorepo packages/ dir and node_modules/@fyit/.
 */
function discoverManifestsMeta(rootDir: string): ManifestMeta[] {
  const metas: ManifestMeta[] = []
  const seen = new Set<string>()

  // Strategy 1: Monorepo packages/crouton-*/crouton.manifest.ts
  let dir = resolve(rootDir)
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      const packagesDir = join(dir, 'packages')
      if (existsSync(packagesDir)) {
        for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
          if (entry.isDirectory() && entry.name.startsWith('crouton-')) {
            const manifestPath = join(packagesDir, entry.name, 'crouton.manifest.ts')
            if (existsSync(manifestPath)) {
              const meta = scanManifestMeta(manifestPath)
              if (meta && !seen.has(meta.id)) {
                seen.add(meta.id)
                metas.push(meta)
              }
            }
          }
        }
      }
      break
    }
    dir = dirname(dir)
  }

  // Strategy 2: node_modules/@fyit/crouton-*/crouton.manifest.ts
  const nmDir = join(rootDir, 'node_modules', '@fyit')
  if (existsSync(nmDir)) {
    for (const entry of readdirSync(nmDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('crouton-')) {
        const manifestPath = join(nmDir, entry.name, 'crouton.manifest.ts')
        if (existsSync(manifestPath)) {
          const meta = scanManifestMeta(manifestPath)
          if (meta && !seen.has(meta.id)) {
            seen.add(meta.id)
            metas.push(meta)
          }
        }
      }
    }
  }

  return metas
}

// ---------------------------------------------------------------------------
// Feature key ↔ package ID mapping
// ---------------------------------------------------------------------------

/** Convert manifest ID to CroutonOptions feature key: 'crouton-mcp-toolkit' → 'mcpToolkit' */
function manifestIdToFeatureKey(id: string): string {
  return id.replace(/^crouton-/, '').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Layer list builder (shared by getRequiredLayers + getCroutonLayers)
// ---------------------------------------------------------------------------

/**
 * Build the list of @fyit/crouton-* layer packages to include.
 *
 * - `crouton-core` is always included.
 * - Bundled packages (manifest.bundled: true) are included unless explicitly disabled.
 * - Non-bundled packages are included only when explicitly enabled.
 */
function buildLayerList(features: CroutonOptions, manifests: ManifestMeta[]): string[] {
  const layers: string[] = ['@fyit/crouton-core']

  for (const m of manifests) {
    if (m.id === 'crouton-core') continue

    const featureKey = manifestIdToFeatureKey(m.id)
    const featureValue = (features as Record<string, unknown>)[featureKey]

    if (m.bundled) {
      // Bundled packages: included unless explicitly set to false
      if (featureValue !== false) layers.push(`@fyit/${m.id}`)
    } else if (featureValue) {
      // Optional packages: included only when truthy
      layers.push(`@fyit/${m.id}`)
    }
  }

  return layers
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

/**
 * Load crouton.config.js synchronously (for use in nuxt.config.ts extends)
 */
function loadCroutonConfig(): CroutonConfig | null {
  const extensions = ['.js', '.mjs', '.cjs', '.ts']
  const baseName = 'crouton.config'

  for (const ext of extensions) {
    const configPath = resolve(process.cwd(), `${baseName}${ext}`)
    if (existsSync(configPath)) {
      try {
        // For sync loading, we read the file and extract the default export
        // This is a simplified approach - works for basic configs
        const content = readFileSync(configPath, 'utf-8')

        // Try to parse as JSON-like object (handles most cases)
        const match = content.match(/export\s+default\s+(\{[\s\S]*\})/)
        if (match) {
          // Use Function constructor to evaluate (safer than eval)
          // eslint-disable-next-line no-new-func
          const config = new Function(`return ${match[1]}`)()
          return config as CroutonConfig
        }
      } catch {
        // Ignore parse errors, will fall back to passed options
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Exported: getCroutonLayers()
// ---------------------------------------------------------------------------

/**
 * Resolve enabled features to an array of @fyit/crouton-* package names.
 *
 * Reads `crouton.config.{js,ts}` and discovers package manifests to determine
 * which layers to include. Pass `overrides` to enable/disable features beyond
 * what the config file specifies.
 *
 * @example
 * // nuxt.config.ts
 * import { getCroutonLayers } from '@fyit/crouton'
 * export default defineNuxtConfig({
 *   extends: [...getCroutonLayers(), './layers/shop'],
 * })
 *
 * @example
 * // With inline overrides (no config file needed)
 * extends: getCroutonLayers({ editor: true, pages: true })
 */
export function getCroutonLayers(overrides?: Partial<CroutonOptions>): string[] {
  const config = loadCroutonConfig()
  const features: CroutonOptions = { ...config?.features, ...overrides }
  const manifests = discoverManifestsMeta(process.cwd())
  return buildLayerList(features, manifests)
}

// ---------------------------------------------------------------------------
// Internal: getRequiredLayers (validation warnings)
// ---------------------------------------------------------------------------

/**
 * Compute required layers based on enabled features.
 * Uses manifest discovery — no hardcoded feature-to-package mapping.
 */
function getRequiredLayers(features: CroutonOptions): string[] {
  const manifests = discoverManifestsMeta(process.cwd())
  return buildLayerList(features, manifests)
}

export default defineNuxtModule<CroutonOptions>({
  meta: {
    name: '@fyit/crouton',
    configKey: 'crouton',
    compatibility: {
      nuxt: '>=4.0.0'
    }
  },

  defaults: {
    // Global settings
    apiPrefix: '/api',
    defaultPageSize: 20,

    // Core add-ons (bundled, enabled by default)
    auth: true,
    admin: true,
    i18n: true,

    // Optional add-ons (disabled by default)
    editor: false,
    flow: false,
    assets: false,
    maps: false,
    ai: false,
    email: false,
    events: false,
    collab: false,
    pages: false,
    mcpToolkit: false,
    devtools: undefined, // Auto-detect based on dev mode

    // Mini-apps (disabled by default)
    bookings: false,
    sales: false
  },

  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Load config from crouton.config.js and merge with nuxt.config options
    const fileConfig = loadCroutonConfig()
    const mergedOptions = {
      ...fileConfig?.features,
      ...options // nuxt.config.ts options override file config
    }

    // Set runtime config for global settings (merge, don't overwrite)
    nuxt.options.runtimeConfig.public.crouton = {
      ...nuxt.options.runtimeConfig.public.crouton,
      apiPrefix: mergedOptions.apiPrefix || '/api',
      defaultPageSize: mergedOptions.defaultPageSize || 20
    }

    // Set AI runtime config if AI is enabled
    if (mergedOptions.ai) {
      const aiConfig = typeof mergedOptions.ai === 'object' ? mergedOptions.ai : {}
      nuxt.options.runtimeConfig.public.croutonAI = {
        ...nuxt.options.runtimeConfig.public.croutonAI,
        defaultModel: aiConfig.defaultModel || 'gpt-4o-mini',
        defaultProvider: aiConfig.defaultProvider
      }
    }

    // NOTE: Layers must be added via extends in nuxt.config.ts BEFORE modules load.
    // This module cannot dynamically add layers. Run 'crouton config' to sync extends.
    // See documentation for proper setup.

    // Check if required layers are present and warn if not
    const requiredLayers = getRequiredLayers(mergedOptions)
    const existingLayers = (nuxt.options._layers || []).map((l: any) => l.config?.name || l.cwd)

    const missingLayers = requiredLayers.filter(layer => {
      // Check if any existing layer path contains the package name
      return !existingLayers.some((existing: string) =>
        existing.includes(layer.replace('@fyit/', ''))
      )
    })

    if (missingLayers.length > 0) {
      console.warn(`🍞 crouton:module Missing layers! Add these to your nuxt.config.ts extends:`)
      console.warn(`                  extends: ['${missingLayers.join("', '")}']`)
      console.warn(`                  Or run 'crouton config' to sync automatically.`)
    }

    // Log enabled features in development (derived from manifests)
    if (nuxt.options.dev) {
      const manifests = discoverManifestsMeta(process.cwd())
      const enabledFeatures = ['core']

      for (const m of manifests) {
        if (m.id === 'crouton-core') continue
        const featureKey = manifestIdToFeatureKey(m.id)
        const featureValue = (mergedOptions as Record<string, unknown>)[featureKey]

        if (m.bundled && featureValue !== false) {
          enabledFeatures.push(featureKey)
        } else if (featureValue) {
          enabledFeatures.push(featureKey)
        }
      }

      // Devtools: auto-detect in dev mode when not explicitly configured
      if (mergedOptions.devtools === undefined && nuxt.options.dev) {
        if (!enabledFeatures.includes('devtools')) enabledFeatures.push('devtools')
      }

      console.log(`🍞 crouton ✓ Enabled features: ${enabledFeatures.join(', ')}`)
      if (fileConfig) {
        console.log(`🍞 crouton ✓ Config loaded from crouton.config.js`)
      }
    }
  }
})
