import { defineNuxtModule, createResolver } from '@nuxt/kit'
import type { CroutonOptions } from './types'

export type { CroutonOptions }

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

  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Set runtime config for global settings
    nuxt.options.runtimeConfig.public.crouton = {
      apiPrefix: options.apiPrefix!,
      defaultPageSize: options.defaultPageSize!
    }

    // Initialize extends array if not present
    nuxt.options.extends ||= []

    // Helper to add a layer
    const addLayer = (packageName: string) => {
      // Ensure extends is an array
      if (!Array.isArray(nuxt.options.extends)) {
        nuxt.options.extends = [nuxt.options.extends].filter(Boolean) as string[]
      }
      nuxt.options.extends.push(packageName)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Always include core
    // ═══════════════════════════════════════════════════════════════════════════
    addLayer('@fyit/crouton-core')

    // ═══════════════════════════════════════════════════════════════════════════
    // Core add-ons (bundled, can be disabled)
    // ═══════════════════════════════════════════════════════════════════════════
    if (options.auth !== false) {
      addLayer('@fyit/crouton-auth')
    }

    if (options.admin !== false) {
      addLayer('@fyit/crouton-admin')
    }

    if (options.i18n !== false) {
      addLayer('@fyit/crouton-i18n')
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Optional add-ons
    // ═══════════════════════════════════════════════════════════════════════════
    if (options.editor) {
      addLayer('@fyit/crouton-editor')
    }

    if (options.flow) {
      addLayer('@fyit/crouton-flow')
    }

    if (options.assets) {
      addLayer('@fyit/crouton-assets')
    }

    if (options.maps) {
      addLayer('@fyit/crouton-maps')
    }

    if (options.ai) {
      addLayer('@fyit/crouton-ai')
    }

    if (options.email) {
      addLayer('@fyit/crouton-email')
    }

    if (options.events) {
      addLayer('@fyit/crouton-events')
    }

    if (options.collab) {
      addLayer('@fyit/crouton-collab')
    }

    if (options.pages) {
      addLayer('@fyit/crouton-pages')
    }

    // Devtools: enabled by default in dev mode, can be explicitly set
    const enableDevtools = options.devtools ?? nuxt.options.dev
    if (enableDevtools) {
      addLayer('@fyit/crouton-devtools')
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Mini-apps
    // ═══════════════════════════════════════════════════════════════════════════
    if (options.bookings) {
      addLayer('@fyit/crouton-bookings')
    }

    if (options.sales) {
      addLayer('@fyit/crouton-sales')
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
        enableDevtools && 'devtools',
        options.bookings && 'bookings',
        options.sales && 'sales'
      ].filter(Boolean)

      console.log(`[crouton] Enabled features: ${enabledFeatures.join(', ')}`)
    }
  }
})
