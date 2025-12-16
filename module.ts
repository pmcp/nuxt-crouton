/**
 * @crouton/auth Nuxt Module
 *
 * Entry point for the @crouton/auth Nuxt layer.
 * Wraps Better Auth with teams, billing, passkeys, and 2FA support.
 */
import {
  defineNuxtModule,
  addServerHandler,
  addImportsDir,
  createResolver,
  addComponentsDir,
  addServerPlugin,
  addRouteMiddleware,
  addPlugin,
} from '@nuxt/kit'
import type { NuxtPage } from '@nuxt/schema'
import { defu } from 'defu'
import type { CroutonAuthConfig } from './types/config'

// Module meta
export const name = '@crouton/auth'
export const version = '0.1.0'

// Default configuration
const defaults: CroutonAuthConfig = {
  mode: 'personal',
  methods: {
    password: true,
    oauth: undefined,
    passkeys: false,
    twoFactor: false,
    magicLink: false,
    phone: false,
  },
  teams: {
    allowCreate: true,
    limit: 5,
    memberLimit: 100,
    requireInvite: true,
    invitationExpiry: 172800, // 48 hours
    requireEmailVerification: false,
    defaultRole: 'member',
  },
  billing: {
    enabled: false,
    provider: 'stripe',
  },
  ui: {
    theme: 'default',
    redirects: {
      afterLogin: '/dashboard',
      afterLogout: '/',
      afterRegister: '/dashboard',
      unauthenticated: '/auth/login',
      authenticated: '/dashboard',
    },
    showRememberMe: true,
    showSocialLogin: true,
    darkMode: true,
  },
  session: {
    expiresIn: 604800, // 7 days
    cookieName: 'better-auth.session_token',
    sameSite: 'lax',
  },
  debug: false,
}

/**
 * Validate the configuration
 */
function validateConfig(config: CroutonAuthConfig): void {
  // Validate mode
  if (!['multi-tenant', 'single-tenant', 'personal'].includes(config.mode)) {
    throw new Error(
      `[${name}] Invalid mode: ${config.mode}. Must be 'multi-tenant', 'single-tenant', or 'personal'.`
    )
  }

  // Validate billing config
  if (config.billing?.enabled && !config.billing.stripe) {
    console.warn(
      `[${name}] Billing is enabled but Stripe is not configured. Billing features will be disabled.`
    )
  }

  // Validate passkey config for production
  if (config.methods?.passkeys && typeof config.methods.passkeys === 'object') {
    if (!config.methods.passkeys.rpId) {
      console.warn(
        `[${name}] Passkeys enabled but rpId not set. Will use current domain in production.`
      )
    }
  }

  // Mode-specific validation
  if (config.mode === 'personal') {
    if (config.teams?.allowCreate) {
      console.info(
        `[${name}] Personal mode: Team creation is automatically managed (one team per user).`
      )
    }
  }

  if (config.mode === 'single-tenant') {
    if (config.teams?.limit && config.teams.limit > 1) {
      console.warn(
        `[${name}] Single-tenant mode: Team limit should be 1. Ignoring configured limit.`
      )
    }
  }
}

/**
 * Apply mode-specific defaults
 */
function applyModeDefaults(config: CroutonAuthConfig): CroutonAuthConfig {
  switch (config.mode) {
    case 'multi-tenant':
      return defu(config, {
        teams: {
          allowCreate: true,
          limit: 5,
        },
      })

    case 'single-tenant':
      return defu(config, {
        teams: {
          allowCreate: false,
          limit: 1,
        },
      })

    case 'personal':
      return defu(config, {
        teams: {
          allowCreate: false,
          limit: 1,
        },
      })

    default:
      return config
  }
}

export default defineNuxtModule<CroutonAuthConfig>({
  meta: {
    name,
    version,
    configKey: 'croutonAuth',
    compatibility: {
      nuxt: '^3.14.0 || ^4.0.0',
    },
  },

  defaults,

  async setup(moduleConfig, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Merge config with mode-specific defaults
    const config = applyModeDefaults(
      defu(moduleConfig, defaults)
    )

    // Validate configuration
    validateConfig(config)

    // Log mode in development
    if (nuxt.options.dev && config.debug) {
      console.log(`[${name}] Running in ${config.mode} mode`)
    }

    // Set runtime config
    nuxt.options.runtimeConfig.public.crouton = defu(
      nuxt.options.runtimeConfig.public.crouton,
      { auth: config }
    )

    // Register server-side auth secret
    nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth, {
      secret: process.env.BETTER_AUTH_SECRET || '',
      baseUrl: process.env.BETTER_AUTH_URL || '',
    })

    // Add composables
    addImportsDir(resolver.resolve('./app/composables'))

    // Add components
    addComponentsDir({
      path: resolver.resolve('./app/components'),
      pathPrefix: false,
      prefix: '',
      global: false,
    })

    // Add server utilities
    nuxt.options.nitro = defu(nuxt.options.nitro, {
      imports: {
        dirs: [resolver.resolve('./server/utils')],
      },
    })

    // Add auth API handler
    addServerHandler({
      route: '/api/auth/**',
      handler: resolver.resolve('./server/api/auth/[...all]'),
    })

    // Add server plugins based on mode
    addServerPlugin(resolver.resolve('./server/plugins/auth-init'))

    if (config.mode === 'single-tenant') {
      addServerPlugin(resolver.resolve('./server/plugins/single-tenant-init'))
    }

    // Add route middleware
    addRouteMiddleware({
      name: 'auth',
      path: resolver.resolve('./app/middleware/auth'),
    })

    addRouteMiddleware({
      name: 'guest',
      path: resolver.resolve('./app/middleware/guest'),
    })

    addRouteMiddleware({
      name: 'team-context',
      path: resolver.resolve('./app/middleware/team-context'),
      global: true,
    })

    // Add client-side plugin
    addPlugin({
      src: resolver.resolve('./app/plugins/auth-client'),
      mode: 'client',
    })

    // Transpile the module
    nuxt.options.build.transpile.push(resolver.resolve('./'))

    // Route transformation based on mode
    // Multi-tenant: keep /dashboard/[team]/... routes
    // Single-tenant/Personal: transform to /dashboard/... (remove [team] param)
    if (config.mode !== 'multi-tenant') {
      nuxt.hook('pages:extend', (pages) => {
        transformTeamRoutes(pages, config.debug)
      })

      if (config.debug) {
        console.log(`[${name}] Route transformation enabled for ${config.mode} mode`)
      }
    }

    // Log setup complete
    if (config.debug) {
      console.log(`[${name}] Module setup complete`)
      console.log(`[${name}] Mode: ${config.mode}`)
      console.log(`[${name}] Auth methods:`, Object.keys(config.methods || {}).filter(k => config.methods?.[k as keyof typeof config.methods]))
      if (config.billing?.enabled) {
        console.log(`[${name}] Billing: enabled (${config.billing.provider})`)
      }
    }
  },
})

/**
 * Transform team routes for single-tenant and personal modes
 * Removes [team] dynamic segment from dashboard routes
 *
 * Examples:
 * - /dashboard/:team → /dashboard
 * - /dashboard/:team/settings → /dashboard/settings
 * - /dashboard/:team/locations → /dashboard/locations
 */
function transformTeamRoutes(pages: NuxtPage[], debug?: boolean): void {
  for (const page of pages) {
    // Transform paths containing :team dynamic segment
    if (page.path && page.path.includes(':team')) {
      const originalPath = page.path

      // Remove :team segment from path
      // Handles: /:team, /:team/, :team/ patterns
      page.path = page.path
        .replace(/\/:team(?=\/|$)/, '') // Remove /:team when followed by / or end
        .replace(/^:team(?=\/|$)/, '') // Remove :team at start
        || '/' // Ensure we have at least a slash

      // Clean up double slashes
      page.path = page.path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'

      // Update route name to remove team param
      if (page.name) {
        page.name = page.name.replace(/-team-/g, '-').replace(/-team$/, '')
      }

      if (debug) {
        console.log(`[${name}] Route transformed: ${originalPath} → ${page.path}`)
      }
    }

    // Recursively transform child routes
    if (page.children?.length) {
      transformTeamRoutes(page.children, debug)
    }
  }
}

// Re-export types
export type { CroutonAuthConfig } from './types/config'
