import { defineNuxtModule, createResolver, addServerHandler, installModule } from '@nuxt/kit'
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
    const reviewOn = process.env.NUXT_PUBLIC_CROUTON_REVIEW === 'true'
    const overlayOn = nuxt.options.dev
      || process.env.NUXT_PUBLIC_CROUTON_DEVTOOLS === 'true'
      || reviewOn

    // --- In-page feedback toolkit → @fyit/crouton-feedback ------------------
    // The glasses launcher, Console (eruda), Annotate, the source-stamp transform
    // and the sink dispatcher were extracted into @fyit/crouton-feedback (epic
    // #960) so any Nuxt UI app can use them. crouton-devtools now INSTALLS that
    // module under its own gate, so `crouton init` apps need no extra wiring.
    // Registered before the dev-only early return so a flagged staging build gets
    // it too; crouton-feedback runtime-gates as well, so production ships nothing.
    if (overlayOn) {
      const devtoolsResolver = createResolver(import.meta.url)

      // Back-compat for the staging review flow (#491/#519): existing deploys set
      // the credentials as NUXT_CROUTON_REVIEW_* Worker secrets. Keep a
      // `croutonReview` runtimeConfig namespace so Nuxt still resolves those names
      // at runtime; the reviewAlias Nitro plugin (below) then copies them into
      // crouton-feedback's github-sink config per request. Empty-string defaults
      // are load-bearing — Nuxt only maps env onto keys already present.
      ;(nuxt.options.runtimeConfig as Record<string, any>).croutonReview = {
        githubAppId: '',
        githubAppPrivateKey: '',
        githubAppInstallationId: '',
        githubToken: '',
        repository: process.env.GITHUB_REPOSITORY || '',
        pr: process.env.CROUTON_REVIEW_PR || ''
      }
      if (reviewOn) {
        nuxt.options.runtimeConfig.public ||= {}
        ;(nuxt.options.runtimeConfig.public as Record<string, any>).croutonReview = true
      }

      // Install the toolkit, forced on under our gate. On a staging review build
      // default the sink to `github` so an annotation lands as the PR comment the
      // subscribed agent keys off (the reviewAlias plugin fills the creds at runtime).
      await installModule('@fyit/crouton-feedback', {
        enabled: true,
        feedback: reviewOn ? { sink: 'github' } : {}
      })

      // Runtime alias: NUXT_CROUTON_REVIEW_* (croutonReview) → croutonFeedback.
      nuxt.hook('nitro:config', (nitroConfig) => {
        nitroConfig.plugins ||= []
        nitroConfig.plugins.push(devtoolsResolver.resolve('./runtime/server/plugins/reviewAlias'))
      })
    }

    // Only enable the devtools TABS in development mode.
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

    // Add events-specific RPC handlers — ONLY when the events package is present.
    // These handlers statically `import('~~/.../schema')` event-table paths that
    // don't exist in a standard generated app (its schema lives at
    // `server/db/schema`). nitro dev eagerly resolves those literal specifiers at
    // build time, so registering them unconditionally hard-fails `pnpm dev` with
    // ENOENT for any devtools-enabled, events-free app (#799). The runtime handler
    // already no-ops when `!hasEventsPackage`, so gating registration here loses
    // nothing and keeps the broken import out of the bundle entirely.
    if (hasEventsPackage) {
      addServerHandler({
        route: '/__nuxt_crouton_devtools/api/events',
        handler: resolver.resolve('./runtime/server-rpc/events')
      })

      addServerHandler({
        route: '/__nuxt_crouton_devtools/api/events/health',
        handler: resolver.resolve('./runtime/server-rpc/eventsHealth')
      })
    }

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
