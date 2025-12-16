/**
 * Better Auth Instance Factory
 *
 * Creates and configures a Better Auth instance based on @crouton/auth configuration.
 * Supports SQLite (NuxtHub D1) with Drizzle adapter.
 *
 * @example
 * ```typescript
 * // In a Nitro plugin
 * import { createAuth } from '../lib/auth'
 *
 * const auth = createAuth(config, db)
 * ```
 */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import type { BetterAuthOptions } from 'better-auth'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type {
  CroutonAuthConfig,
  SessionConfig,
  PasswordConfig,
  OAuthConfig,
  GitHubOAuthConfig,
  GoogleOAuthConfig,
  DiscordOAuthConfig,
  OAuthProviderConfig,
} from '../../types/config'

// Re-export type helpers for use in this module
export { isMethodEnabled, getMethodConfig } from '../../types/config'

/**
 * Database provider type
 */
export type DatabaseProvider = 'sqlite' | 'pg' | 'mysql'

/**
 * Options for creating the auth instance
 */
export interface CreateAuthOptions {
  /** @crouton/auth configuration */
  config: CroutonAuthConfig
  /** Drizzle database instance */
  db: DrizzleD1Database<Record<string, unknown>>
  /** Database provider (default: 'sqlite') */
  provider?: DatabaseProvider
  /** Better Auth secret for session encryption */
  secret: string
  /** Application base URL */
  baseURL: string
  /** Optional Drizzle schema for custom table names */
  schema?: Record<string, unknown>
}

/**
 * Create a Better Auth instance configured for @crouton/auth
 *
 * This factory function creates a Better Auth instance with:
 * - Drizzle adapter for database operations
 * - Session configuration from @crouton/auth config
 * - Email/password authentication (configurable)
 * - Base configuration that can be extended with plugins
 *
 * @param options - Configuration options
 * @returns Configured Better Auth instance
 */
export function createAuth(options: CreateAuthOptions) {
  const {
    config,
    db,
    provider = 'sqlite',
    secret,
    baseURL,
    schema,
  } = options

  // Build Better Auth configuration
  const authConfig: BetterAuthOptions = {
    // Database adapter
    database: drizzleAdapter(db, {
      provider,
      ...(schema && { schema }),
    }),

    // Base URL for callbacks
    baseURL,

    // Secret for session encryption
    secret,

    // Email and password configuration
    emailAndPassword: buildEmailPasswordConfig(config),

    // OAuth/Social providers configuration
    socialProviders: buildSocialProvidersConfig(config.methods?.oauth, baseURL),

    // Session configuration
    session: buildSessionConfig(config.session),

    // Advanced options
    advanced: {
      // Generate secure IDs
      generateId: () => crypto.randomUUID(),
    },

    // Plugins - Organization (Teams) support
    plugins: [
      organization(buildOrganizationConfig(config)),
    ],
  }

  // Create and return the Better Auth instance
  return betterAuth(authConfig)
}

/**
 * Build email/password configuration from @crouton/auth config
 */
function buildEmailPasswordConfig(config: CroutonAuthConfig): BetterAuthOptions['emailAndPassword'] {
  const passwordConfig = config.methods?.password

  // Check if password auth is enabled
  if (passwordConfig === false) {
    return { enabled: false }
  }

  // Default to enabled
  if (passwordConfig === undefined || passwordConfig === true) {
    return {
      enabled: true,
      autoSignIn: true,
      // Default password requirements
      minPasswordLength: 8,
    }
  }

  // Custom password configuration
  const customConfig = passwordConfig as PasswordConfig
  return {
    enabled: customConfig.enabled !== false,
    autoSignIn: true,
    minPasswordLength: customConfig.minLength ?? 8,
    // Password reset
    sendResetPassword: customConfig.resetEnabled !== false
      ? async ({ user, url }: { user: { email: string }; url: string }) => {
          // TODO: Phase 2.x - Implement email sending
          console.log(`[crouton/auth] Password reset email for ${user.email}: ${url}`)
        }
      : undefined,
  }
}

/**
 * Build session configuration from @crouton/auth config
 */
function buildSessionConfig(sessionConfig?: SessionConfig): BetterAuthOptions['session'] {
  const defaults = {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  }

  if (!sessionConfig) {
    return defaults
  }

  return {
    expiresIn: sessionConfig.expiresIn ?? defaults.expiresIn,
    updateAge: sessionConfig.updateAge ?? defaults.updateAge,
    cookieCache: defaults.cookieCache,
  }
}

// ============================================================================
// OAuth/Social Providers Configuration
// ============================================================================

/**
 * Better Auth social provider configuration type
 */
type SocialProviderConfig = {
  clientId: string
  clientSecret: string
  scope?: string[]
  redirectURI?: string
  disableSignUp?: boolean
  [key: string]: unknown
}

/**
 * Build social providers configuration from @crouton/auth OAuth config
 *
 * Supports GitHub, Google, Discord as built-in providers,
 * plus additional custom providers.
 *
 * @param oauthConfig - OAuth configuration from @crouton/auth config
 * @param baseURL - Application base URL for callback URLs
 * @returns Better Auth socialProviders configuration
 */
function buildSocialProvidersConfig(
  oauthConfig: OAuthConfig | undefined,
  _baseURL: string // Reserved for future use (custom callback URLs)
): BetterAuthOptions['socialProviders'] {
  if (!oauthConfig) {
    return undefined
  }

  const providers: Record<string, SocialProviderConfig> = {}

  // Configure GitHub OAuth
  if (oauthConfig.github) {
    providers.github = buildGitHubConfig(oauthConfig.github)
  }

  // Configure Google OAuth
  if (oauthConfig.google) {
    providers.google = buildGoogleConfig(oauthConfig.google)
  }

  // Configure Discord OAuth
  if (oauthConfig.discord) {
    providers.discord = buildDiscordConfig(oauthConfig.discord)
  }

  // Configure additional custom providers
  for (const [providerName, providerConfig] of Object.entries(oauthConfig)) {
    // Skip built-in providers (already handled above)
    if (['github', 'google', 'discord'].includes(providerName)) {
      continue
    }

    if (providerConfig) {
      providers[providerName] = buildGenericProviderConfig(providerConfig)
    }
  }

  // Return undefined if no providers configured
  if (Object.keys(providers).length === 0) {
    return undefined
  }

  return providers
}

/**
 * Build GitHub OAuth provider configuration
 *
 * GitHub requires `user:email` scope to access email addresses.
 * By default, this scope is included.
 */
function buildGitHubConfig(config: GitHubOAuthConfig): SocialProviderConfig {
  // GitHub MUST include user:email scope
  const defaultScopes = ['user:email']
  const scopes = config.scopes?.length
    ? [...new Set([...defaultScopes, ...config.scopes])]
    : defaultScopes

  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    scope: scopes,
    disableSignUp: config.allowSignUp === false,
  }
}

/**
 * Build Google OAuth provider configuration
 *
 * Google provides email and profile by default.
 * Set accessType to 'offline' to get refresh tokens.
 */
function buildGoogleConfig(config: GoogleOAuthConfig): SocialProviderConfig {
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    scope: config.scopes,
    disableSignUp: config.allowSignUp === false,
    // Ensure we can get refresh tokens (Google only issues on first consent)
    accessType: 'offline' as const,
    // Always show account selector for better UX
    prompt: 'select_account' as const,
  }
}

/**
 * Build Discord OAuth provider configuration
 *
 * Discord provides identify and email scopes by default.
 */
function buildDiscordConfig(config: DiscordOAuthConfig): SocialProviderConfig {
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    scope: config.scopes,
    disableSignUp: config.allowSignUp === false,
  }
}

/**
 * Build generic OAuth provider configuration
 *
 * Used for additional providers beyond GitHub, Google, and Discord.
 * Follows the base OAuthProviderConfig interface.
 */
function buildGenericProviderConfig(config: OAuthProviderConfig): SocialProviderConfig {
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    scope: config.scopes,
  }
}

/**
 * Organization (Teams) Plugin Configuration
 *
 * Maps @crouton/auth config to Better Auth's organization plugin.
 * Supports three modes with different behaviors:
 *
 * - Multi-tenant: Users can create/join multiple organizations
 * - Single-tenant: One default organization, users auto-join
 * - Personal: Each user gets their own organization (auto-created)
 */
function buildOrganizationConfig(config: CroutonAuthConfig) {
  const teamsConfig = config.teams ?? {}
  const mode = config.mode

  // Determine if users can create organizations based on mode
  const getAllowUserToCreateOrganization = () => {
    // In multi-tenant mode, use config setting (default: true)
    if (mode === 'multi-tenant') {
      return teamsConfig.allowCreate !== false
    }
    // In single-tenant and personal modes, users don't create orgs manually
    // (single-tenant has one default org, personal auto-creates on signup)
    return false
  }

  // Determine organization limit based on mode
  const getOrganizationLimit = () => {
    switch (mode) {
      case 'personal':
        // Personal mode: one org per user
        return 1
      case 'single-tenant':
        // Single-tenant: users belong to one org (the default)
        return 1
      case 'multi-tenant':
      default:
        // Multi-tenant: use config limit (default: 5)
        return teamsConfig.limit ?? 5
    }
  }

  return {
    // Organization creation control
    allowUserToCreateOrganization: getAllowUserToCreateOrganization(),

    // Organization limit per user
    organizationLimit: getOrganizationLimit(),

    // Member limit per organization
    membershipLimit: teamsConfig.memberLimit ?? 100,

    // Creator gets "owner" role
    creatorRole: 'owner' as const,

    // Invitation configuration
    invitationExpiresIn: teamsConfig.invitationExpiry ?? 172800, // 48 hours default
    cancelPendingInvitationsOnReInvite: true,
    requireEmailVerificationOnInvitation: teamsConfig.requireEmailVerification ?? false,

    // Send invitation email (placeholder - will be configured by user)
    sendInvitationEmail: async (data: {
      id: string
      email: string
      organization: { name: string; id: string }
      inviter: { user: { name: string; email: string } }
      role: string
      expiresAt: Date
    }) => {
      // Log invitation for development - production should override this
      console.log(`[crouton/auth] Invitation sent:`, {
        to: data.email,
        organization: data.organization.name,
        invitedBy: data.inviter.user.name,
        role: data.role,
        expiresAt: data.expiresAt,
        // The app should use this ID to create an accept link:
        // e.g., `${baseUrl}/auth/accept-invitation/${data.id}`
        invitationId: data.id,
      })
    },

    // Organization lifecycle hooks
    organizationHooks: buildOrganizationHooks(config),
  }
}

/**
 * Build organization lifecycle hooks based on mode
 */
function buildOrganizationHooks(config: CroutonAuthConfig) {
  const mode = config.mode

  return {
    // After organization is created - set up any mode-specific defaults
    afterCreateOrganization: async (ctx: {
      organization: { id: string; name: string; slug: string }
      user: { id: string; name: string }
    }) => {
      if (config.debug) {
        console.log(`[crouton/auth] Organization created:`, {
          id: ctx.organization.id,
          name: ctx.organization.name,
          mode,
        })
      }
    },

    // After member is added - handle mode-specific member setup
    afterAddMember: async (ctx: {
      member: { id: string; role: string }
      user: { id: string; name: string; email: string }
      organization: { id: string; name: string }
    }) => {
      if (config.debug) {
        console.log(`[crouton/auth] Member added:`, {
          userId: ctx.user.id,
          organizationId: ctx.organization.id,
          role: ctx.member.role,
        })
      }
    },

    // Before creating invitation - validate based on config
    beforeCreateInvitation: async (ctx: {
      invitation: { email: string; role: string; expiresAt: Date }
      organization: { id: string }
    }) => {
      // In single-tenant mode, all invitations should use the default team
      if (mode === 'single-tenant') {
        const defaultTeamId = config.defaultTeamId ?? 'default'
        if (ctx.organization.id !== defaultTeamId) {
          throw new Error('Invitations can only be sent for the default organization')
        }
      }

      // Apply default role if configured
      const defaultRole = config.teams?.defaultRole ?? 'member'
      return {
        data: {
          ...ctx.invitation,
          role: ctx.invitation.role || defaultRole,
        },
      }
    },
  }
}

// ============================================================================
// OAuth Provider Utilities
// ============================================================================

/**
 * Supported OAuth provider names
 */
export type SupportedOAuthProvider = 'github' | 'google' | 'discord' | string

/**
 * OAuth provider info for UI display
 */
export interface OAuthProviderInfo {
  /** Provider identifier */
  id: SupportedOAuthProvider
  /** Display name */
  name: string
  /** Icon name (for Nuxt UI icons) */
  icon: string
  /** Brand color (hex) */
  color: string
}

/**
 * Built-in OAuth provider metadata
 */
const BUILTIN_PROVIDERS: Record<string, Omit<OAuthProviderInfo, 'id'>> = {
  github: {
    name: 'GitHub',
    icon: 'i-simple-icons-github',
    color: '#24292e',
  },
  google: {
    name: 'Google',
    icon: 'i-simple-icons-google',
    color: '#4285f4',
  },
  discord: {
    name: 'Discord',
    icon: 'i-simple-icons-discord',
    color: '#5865f2',
  },
}

/**
 * Get list of configured OAuth providers from config
 *
 * @param oauthConfig - OAuth configuration
 * @returns Array of configured provider info for UI display
 */
export function getConfiguredOAuthProviders(
  oauthConfig: OAuthConfig | undefined
): OAuthProviderInfo[] {
  if (!oauthConfig) {
    return []
  }

  const providers: OAuthProviderInfo[] = []

  for (const [providerId, providerConfig] of Object.entries(oauthConfig)) {
    if (!providerConfig) continue

    const builtin = BUILTIN_PROVIDERS[providerId]
    if (builtin) {
      providers.push({
        id: providerId,
        ...builtin,
      })
    } else {
      // Custom provider - use ID as name, generic icon
      providers.push({
        id: providerId,
        name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
        icon: 'i-heroicons-key',
        color: '#6b7280',
      })
    }
  }

  return providers
}

/**
 * Check if a specific OAuth provider is configured
 *
 * @param oauthConfig - OAuth configuration
 * @param provider - Provider name to check
 * @returns True if the provider is configured
 */
export function isOAuthProviderConfigured(
  oauthConfig: OAuthConfig | undefined,
  provider: string
): boolean {
  if (!oauthConfig) return false
  const config = oauthConfig[provider]
  return !!config && !!config.clientId && !!config.clientSecret
}

/**
 * Get the OAuth callback URL for a provider
 *
 * Better Auth uses the pattern: /api/auth/callback/{provider}
 *
 * @param baseURL - Application base URL
 * @param provider - Provider name
 * @returns Full callback URL
 */
export function getOAuthCallbackURL(baseURL: string, provider: string): string {
  const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  return `${base}/api/auth/callback/${provider}`
}

// ============================================================================
// Auth Instance Management
// ============================================================================

/**
 * Type for the created auth instance
 */
export type AuthInstance = ReturnType<typeof createAuth>

/**
 * Server-side auth instance holder
 *
 * This is set by the auth-init plugin and used throughout the server.
 * Use `useServerAuth()` to access it safely.
 */
let _authInstance: AuthInstance | null = null

/**
 * Set the global auth instance (called by auth-init plugin)
 */
export function setAuthInstance(auth: AuthInstance): void {
  _authInstance = auth
}

/**
 * Get the global auth instance
 *
 * @throws Error if auth is not initialized
 */
export function getAuthInstance(): AuthInstance {
  if (!_authInstance) {
    throw new Error(
      '[crouton/auth] Auth not initialized. Make sure the auth-init plugin has run.'
    )
  }
  return _authInstance
}

/**
 * Check if auth is initialized
 */
export function isAuthInitialized(): boolean {
  return _authInstance !== null
}
