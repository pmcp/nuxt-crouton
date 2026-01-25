import { defineNuxtModule, createResolver, resolvePath } from '@nuxt/kit'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CroutonOptions, CroutonConfig } from './types'

export type { CroutonOptions, CroutonConfig }

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

/**
 * Internal helper to compute required layers based on features.
 * Used for validation warnings only.
 */
function getRequiredLayers(features: CroutonOptions): string[] {
  const layers: string[] = []

  // Always include core
  layers.push('@fyit/crouton-core')

  // Core add-ons (enabled by default)
  if (features.auth !== false) layers.push('@fyit/crouton-auth')
  if (features.admin !== false) layers.push('@fyit/crouton-admin')
  if (features.i18n !== false) layers.push('@fyit/crouton-i18n')

  // Optional add-ons
  if (features.editor) layers.push('@fyit/crouton-editor')
  if (features.flow) layers.push('@fyit/crouton-flow')
  if (features.assets) layers.push('@fyit/crouton-assets')
  if (features.maps) layers.push('@fyit/crouton-maps')
  if (features.ai) layers.push('@fyit/crouton-ai')
  if (features.email) layers.push('@fyit/crouton-email')
  if (features.events) layers.push('@fyit/crouton-events')
  if (features.collab) layers.push('@fyit/crouton-collab')
  if (features.pages) layers.push('@fyit/crouton-pages')

  // Mini-apps
  if (features.bookings) layers.push('@fyit/crouton-bookings')
  if (features.sales) layers.push('@fyit/crouton-sales')

  return layers
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

    // Log enabled features in development
    if (nuxt.options.dev) {
      const enabledFeatures = [
        'core',
        mergedOptions.auth !== false && 'auth',
        mergedOptions.admin !== false && 'admin',
        mergedOptions.i18n !== false && 'i18n',
        mergedOptions.editor && 'editor',
        mergedOptions.flow && 'flow',
        mergedOptions.assets && 'assets',
        mergedOptions.maps && 'maps',
        mergedOptions.ai && 'ai',
        mergedOptions.email && 'email',
        mergedOptions.events && 'events',
        mergedOptions.collab && 'collab',
        mergedOptions.pages && 'pages',
        (mergedOptions.devtools ?? nuxt.options.dev) && 'devtools',
        mergedOptions.bookings && 'bookings',
        mergedOptions.sales && 'sales'
      ].filter(Boolean)

      console.log(`🍞 crouton ✓ Enabled features: ${enabledFeatures.join(', ')}`)
      if (fileConfig) {
        console.log(`🍞 crouton ✓ Config loaded from crouton.config.js`)
      }
    }
  }
})
