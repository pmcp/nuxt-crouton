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

    // Read croutonApps registry from merged app config
    const croutonApps = (nuxt.options.appConfig as any)?.croutonApps ?? {}

    // Detect if nuxt-crouton-events package is installed
    // (crouton-events registers itself in app/app.config.ts under croutonApps.events)
    const hasEventsPackage = 'events' in croutonApps

    // Collect API route prefixes from all croutonApps registrations.
    // Each package declares apiRoutes in its app/app.config.ts entry so the
    // tracker can match custom routes beyond /api/crouton-collection/*.
    const apiRoutePrefixes: Array<{ prefix: string, routeGroup: string }> = []
    for (const [appId, appConfig] of Object.entries(croutonApps)) {
      const routes = (appConfig as any)?.apiRoutes
      if (Array.isArray(routes)) {
        for (const prefix of routes) {
          if (typeof prefix === 'string') {
            apiRoutePrefixes.push({ prefix, routeGroup: appId })
          }
        }
      }
    }

    // Store collections config, events detection, and route prefixes in Nitro runtime config
    nuxt.options.nitro = nuxt.options.nitro || {}
    nuxt.options.nitro.runtimeConfig = nuxt.options.nitro.runtimeConfig || {}
    nuxt.options.nitro.runtimeConfig.croutonCollections = nuxt.options.appConfig?.croutonCollections || {}
    nuxt.options.nitro.runtimeConfig.croutonDevtools = {
      hasEventsPackage,
      apiRoutePrefixes
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

    // Add system operations RPC handlers (D1: System Ops tab)
    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/system-operations',
      handler: resolver.resolve('./runtime/server-rpc/systemOperations')
    })

    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/system-operations/clear',
      handler: resolver.resolve('./runtime/server-rpc/clearSystemOperations'),
      method: 'post'
    })

    // Add generation history RPC handler (D3: Generators tab)
    addServerHandler({
      route: '/__nuxt_crouton_devtools/api/generation-history',
      handler: resolver.resolve('./runtime/server-rpc/generationHistory')
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
