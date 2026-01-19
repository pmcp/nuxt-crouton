import { defineNuxtModule, createResolver, addServerHandler } from '@nuxt/kit'
import { addCustomTab } from '@nuxt/devtools-kit'

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@fyit/crouton-devtools',
    configKey: 'croutonDevtools',
    compatibility: {
      nuxt: '^4.0.0'
    }
  },
  defaults: {},
  async setup(_options, nuxt) {
    // Only enable in development mode
    if (nuxt.options.dev === false) {
      return
    }

    const resolver = createResolver(import.meta.url)

    // Detect if nuxt-crouton-events package is installed
    const hasEventsPackage = nuxt.options._layers?.some(
      (layer: any) => layer.config?.name?.includes('nuxt-crouton-events')
        || layer.cwd?.includes('nuxt-crouton-events')
    ) ?? false

    // Store collections config and events detection in Nitro runtime config
    nuxt.options.nitro = nuxt.options.nitro || {}
    nuxt.options.nitro.runtimeConfig = nuxt.options.nitro.runtimeConfig || {}
    nuxt.options.nitro.runtimeConfig.croutonCollections = nuxt.options.appConfig?.croutonCollections || {}
    nuxt.options.nitro.runtimeConfig.croutonDevtools = {
      hasEventsPackage
    }

    // Register operation tracker via Nitro plugin hook
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.plugins = nitroConfig.plugins || []
      nitroConfig.plugins.push(resolver.resolve('./runtime/server/plugins/operationTracker'))
    })

    // Add server RPC handler for collections endpoint
    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/collections',
      handler: resolver.resolve('./runtime/server-rpc/collections')
    })

    // Add server RPC handlers for operations monitoring
    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/operations',
      handler: resolver.resolve('./runtime/server-rpc/operations')
    })

    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/operations/stats',
      handler: resolver.resolve('./runtime/server-rpc/operationStats')
    })

    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/operations/clear',
      handler: resolver.resolve('./runtime/server-rpc/clearOperations'),
      method: 'post'
    })

    // Add server RPC handlers for API Explorer (Phase 2.2)
    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/endpoints',
      handler: resolver.resolve('./runtime/server-rpc/endpoints')
    })

    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/execute',
      handler: resolver.resolve('./runtime/server-rpc/executeRequest'),
      method: 'post'
    })

    // Add events-specific RPC handlers (when events package detected)
    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/events',
      handler: resolver.resolve('./runtime/server-rpc/events')
    })

    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/events/health',
      handler: resolver.resolve('./runtime/server-rpc/eventsHealth')
    })

    // Serve the static HTML client app
    addServerHandler({
      route: '/__nuxt_crouton_devtools',
      handler: resolver.resolve('./runtime/server-rpc/client')
    })

    // Register custom DevTools tab
    addCustomTab(() => ({
      name: 'crouton',
      title: 'Crouton',
      icon: 'carbon:data-table',
      view: {
        type: 'iframe',
        src: '/__nuxt_crouton_devtools'
      }
    }))

    // Inject Data Browser route into main app (Phase 3)
    nuxt.hook('pages:extend', (pages) => {
      pages.push({
        name: 'crouton-devtools-data-browser',
        path: '/__crouton_devtools/data/:collection',
        file: resolver.resolve('./runtime/pages/data-browser.vue')
      })
    })
  }
})
