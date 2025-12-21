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
  addPlugin
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
    phone: false
  },
  teams: {
    allowCreate: true,
    limit: 5,
    memberLimit: 100,
    requireInvite: true,
    invitationExpiry: 172800, // 48 hours
    requireEmailVerification: false,
    defaultRole: 'member'
  },
  billing: {
    enabled: false,
    provider: 'stripe'
  },
  ui: {
    theme: 'default',
    redirects: {
      afterLogin: '/dashboard',
      afterLogout: '/',
      afterRegister: '/dashboard',
      unauthenticated: '/auth/login',
      authenticated: '/dashboard'
    },
    showRememberMe: true,
    showSocialLogin: true,
    darkMode: true
  },
  session: {
    expiresIn: 604800, // 7 days
    cookieName: 'better-auth.session_token',
    sameSite: 'lax'
  },
  debug: false
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
          limit: 5
        }
      })

    case 'single-tenant':
      return defu(config, {
        teams: {
          allowCreate: false,
          limit: 1
        }
      })

    case 'personal':
      return defu(config, {
        teams: {
          allowCreate: false,
          limit: 1
        }
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
      nuxt: '^3.14.0 || ^4.0.0'
    }
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
    // Use spread to preserve other crouton properties while ensuring auth config takes priority
    // (defu preserves existing values, but we want the module's resolved config to win)
    nuxt.options.runtimeConfig.public.crouton = {
      ...nuxt.options.runtimeConfig.public.crouton,
      auth: config
    } as typeof nuxt.options.runtimeConfig.public.crouton

    // Register server-side auth secret
    nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth, {
      secret: process.env.BETTER_AUTH_SECRET || '',
      baseUrl: process.env.BETTER_AUTH_URL || ''
    })

    // Add composables
    addImportsDir(resolver.resolve('./app/composables'))

    // Add utils (error handling, etc.)
    addImportsDir(resolver.resolve('./app/utils'))

    // Add components with performance optimizations
    // Core components (loaded eagerly)
    addComponentsDir({
      path: resolver.resolve('./app/components/Auth'),
      pathPrefix: false,
      prefix: 'Auth',
      global: false
    })

    addComponentsDir({
      path: resolver.resolve('./app/components/Sidebar'),
      pathPrefix: false,
      prefix: '',
      global: false
    })

    addComponentsDir({
      path: resolver.resolve('./app/components/Loading'),
      pathPrefix: false,
      prefix: '',
      global: false
    })

    addComponentsDir({
      path: resolver.resolve('./app/components/Error'),
      pathPrefix: false,
      prefix: '',
      global: false
    })

    // Non-critical components (can be lazy loaded by user)
    addComponentsDir({
      path: resolver.resolve('./app/components/Account'),
      pathPrefix: false,
      prefix: 'Account',
      global: false
    })

    addComponentsDir({
      path: resolver.resolve('./app/components/Team'),
      pathPrefix: false,
      prefix: 'Team',
      global: true // Global so TeamSwitcher is available in dashboard layout
    })

    addComponentsDir({
      path: resolver.resolve('./app/components/Billing'),
      pathPrefix: false,
      prefix: 'Billing',
      global: false
    })

    // Add server utilities
    nuxt.options.nitro = defu(nuxt.options.nitro, {
      imports: {
        dirs: [resolver.resolve('./server/utils')]
      }
    })

    // Add auth API handler
    addServerHandler({
      route: '/api/auth/**',
      handler: resolver.resolve('./server/api/auth/[...all]')
    })

    // Add server plugins based on mode
    addServerPlugin(resolver.resolve('./server/plugins/auth-init'))

    if (config.mode === 'single-tenant') {
      addServerPlugin(resolver.resolve('./server/plugins/single-tenant-init'))
    }

    // Note: Route middleware is auto-discovered from app/middleware/ when used as a layer
    // No need to call addRouteMiddleware() since files exist:
    // - app/middleware/auth.ts
    // - app/middleware/guest.ts
    // - app/middleware/team-context.global.ts (global middleware via .global suffix)

    // Add client-side plugin
    addPlugin({
      src: resolver.resolve('./app/plugins/auth-client.client'),
      mode: 'client'
    })

    // Add team context plugin (for collection integration)
    addPlugin({
      src: resolver.resolve('./app/plugins/team-context'),
      mode: 'all'
    })

    // Add CSS assets
    nuxt.options.css.push(resolver.resolve('./app/assets/css/auth.css'))

    // Transpile the module
    nuxt.options.build.transpile.push(resolver.resolve('./'))

    // Route aliases based on mode
    // Multi-tenant: only /dashboard/[team]/... routes work
    // Single-tenant/Personal: add aliases so both /dashboard/[team]/... AND /dashboard/... work
    if (config.mode !== 'multi-tenant') {
      nuxt.hook('pages:extend', (pages) => {
        addTeamRouteAliases(pages, config.debug)
      })

      if (config.debug) {
        console.log(`[${name}] Route aliases enabled for ${config.mode} mode`)
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
  }
})

/**
 * Generate an alias path by removing :team segment
 * Preserves the rest of the path structure
 */
function generateAliasPath(originalPath: string): string {
  let aliasPath = originalPath
    // Remove /:team() when followed by / or end
    .replace(/\/:team\(\)(?=\/|$)/, '')
    // Remove /:team when followed by / or end
    .replace(/\/:team(?=\/|$)/, '')
    // Remove :team() at start
    .replace(/^:team\(\)(?=\/|$)/, '')
    // Remove :team at start
    .replace(/^:team(?=\/|$)/, '')

  // Clean up double slashes and trailing slashes
  aliasPath = aliasPath.replace(/\/+/g, '/').replace(/\/$/, '') || '/'

  return aliasPath
}

/**
 * Add route aliases for single-tenant and personal modes
 * Adds alias paths without [team] segment while keeping original paths
 *
 * This allows both URL patterns to work:
 * - /dashboard/:team/settings (main route - for multi-tenant compatibility)
 * - /dashboard/settings (alias - for personal/single-tenant convenience)
 *
 * The middleware handles team resolution from session when not in URL.
 *
 * Examples:
 * - /dashboard/:team → alias: /dashboard
 * - /dashboard/:team/settings → alias: /dashboard/settings
 * - /dashboard/:team/crouton → alias: /dashboard/crouton
 */
function addTeamRouteAliases(pages: NuxtPage[], debug?: boolean): void {
  for (const page of pages) {
    // Check if this page has a :team segment in its path
    if (page.path && page.path.includes(':team')) {
      // Generate the alias path by removing :team segment
      const aliasPath = generateAliasPath(page.path)

      if (aliasPath && aliasPath !== page.path) {
        // Initialize alias array if needed, preserving existing aliases
        const existingAliases = Array.isArray(page.alias)
          ? page.alias
          : (page.alias ? [page.alias] : [])

        // Only add if not already present
        if (!existingAliases.includes(aliasPath)) {
          page.alias = [...existingAliases, aliasPath]

          if (debug) {
            console.log(`[${name}] Route alias added: ${page.path} → alias: ${aliasPath}`)
          }
        }
      }
    }

    // Recursively process child routes
    if (page.children?.length) {
      addTeamRouteAliases(page.children, debug)
    }
  }
}

// Re-export types
export type { CroutonAuthConfig } from './types/config'
