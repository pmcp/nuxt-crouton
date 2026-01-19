import { defineNuxtModule, createResolver, resolvePath } from '@nuxt/kit'
import type { CroutonOptions } from './types'

export type { CroutonOptions }

/**
 * Helper to get the layers to extend based on crouton options.
 * Use this in your nuxt.config.ts extends array.
 *
 * @example
 * ```ts
 * import { getCroutonLayers } from '@fyit/crouton'
 *
 * export default defineNuxtConfig({
 *   extends: getCroutonLayers({ bookings: true, email: true }),
 *   modules: ['@fyit/crouton']
 * })
 * ```
 */
export function getCroutonLayers(options: CroutonOptions = {}): string[] {
  const layers: string[] = []

  // Always include core
  layers.push('@fyit/crouton-core')

  // Core add-ons (enabled by default)
  if (options.auth !== false) layers.push('@fyit/crouton-auth')
  if (options.admin !== false) layers.push('@fyit/crouton-admin')
  if (options.i18n !== false) layers.push('@fyit/crouton-i18n')

  // Optional add-ons
  if (options.editor) layers.push('@fyit/crouton-editor')
  if (options.flow) layers.push('@fyit/crouton-flow')
  if (options.assets) layers.push('@fyit/crouton-assets')
  if (options.maps) layers.push('@fyit/crouton-maps')
  if (options.ai) layers.push('@fyit/crouton-ai')
  if (options.email) layers.push('@fyit/crouton-email')
  if (options.events) layers.push('@fyit/crouton-events')
  if (options.collab) layers.push('@fyit/crouton-collab')
  if (options.pages) layers.push('@fyit/crouton-pages')

  // Devtools (skip in getCroutonLayers since it's dev-only)
  // if (options.devtools) layers.push('@fyit/crouton-devtools')

  // Mini-apps
  if (options.bookings) layers.push('@fyit/crouton-bookings')
  if (options.sales) layers.push('@fyit/crouton-sales')

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

    // Set runtime config for global settings (merge, don't overwrite)
    nuxt.options.runtimeConfig.public.crouton = {
      ...nuxt.options.runtimeConfig.public.crouton,
      apiPrefix: options.apiPrefix!,
      defaultPageSize: options.defaultPageSize!
    }

    // NOTE: Layers must be added via extends in nuxt.config.ts BEFORE modules load.
    // This module cannot dynamically add layers - use getCroutonLayers() helper instead.
    // See documentation for proper setup.

    // Check if required layers are present and warn if not
    const requiredLayers = getCroutonLayers(options)
    const existingLayers = (nuxt.options._layers || []).map((l: any) => l.config?.name || l.cwd)

    const missingLayers = requiredLayers.filter(layer => {
      // Check if any existing layer path contains the package name
      return !existingLayers.some((existing: string) =>
        existing.includes(layer.replace('@fyit/', ''))
      )
    })

    if (missingLayers.length > 0) {
      console.warn(`[crouton] Missing layers! Add these to your nuxt.config.ts extends:`)
      console.warn(`         extends: ['${missingLayers.join("', '")}']`)
      console.warn(`         Or use the getCroutonLayers() helper function.`)
    }

    // Log enabled features in development
    if (nuxt.options.dev) {
      const enabledFeatures = [
        'core',
        options.auth !== false && 'auth',
        options.admin !== false && 'admin',
        options.i18n !== false && 'i18n',
        options.editor && 'editor',
        options.flow && 'flow',
        options.assets && 'assets',
        options.maps && 'maps',
        options.ai && 'ai',
        options.email && 'email',
        options.events && 'events',
        options.collab && 'collab',
        options.pages && 'pages',
        (options.devtools ?? nuxt.options.dev) && 'devtools',
        options.bookings && 'bookings',
        options.sales && 'sales'
      ].filter(Boolean)

      console.log(`[crouton] Enabled features: ${enabledFeatures.join(', ')}`)
    }
  }
})
