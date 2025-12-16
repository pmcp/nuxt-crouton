/**
 * @crouton/auth Configuration Types
 *
 * Configuration interface for the @crouton/auth Nuxt layer.
 * Supports three operational modes: multi-tenant, single-tenant, and personal.
 */

// ============================================================================
// OAuth Provider Configuration
// ============================================================================

/**
 * Base OAuth provider configuration
 */
export interface OAuthProviderConfig {
  /** OAuth client ID */
  clientId: string
  /** OAuth client secret */
  clientSecret: string
  /** Optional scopes to request */
  scopes?: string[]
}

/**
 * GitHub OAuth configuration
 */
export interface GitHubOAuthConfig extends OAuthProviderConfig {
  /** Allow sign-up via GitHub (default: true) */
  allowSignUp?: boolean
}

/**
 * Google OAuth configuration
 */
export interface GoogleOAuthConfig extends OAuthProviderConfig {
  /** Allow sign-up via Google (default: true) */
  allowSignUp?: boolean
}

/**
 * Discord OAuth configuration
 */
export interface DiscordOAuthConfig extends OAuthProviderConfig {
  /** Allow sign-up via Discord (default: true) */
  allowSignUp?: boolean
}

/**
 * OAuth providers configuration
 */
export interface OAuthConfig {
  github?: GitHubOAuthConfig
  google?: GoogleOAuthConfig
  discord?: DiscordOAuthConfig
  /** Additional OAuth providers */
  [key: string]: OAuthProviderConfig | undefined
}

// ============================================================================
// Authentication Method Configuration
// ============================================================================

/**
 * Password authentication configuration
 */
export interface PasswordConfig {
  /** Enable email/password authentication (default: true) */
  enabled?: boolean
  /** Minimum password length (default: 8) */
  minLength?: number
  /** Require uppercase letters */
  requireUppercase?: boolean
  /** Require lowercase letters */
  requireLowercase?: boolean
  /** Require numbers */
  requireNumbers?: boolean
  /** Require special characters */
  requireSpecialChars?: boolean
  /** Enable password reset via email (default: true) */
  resetEnabled?: boolean
}

/**
 * Passkey (WebAuthn) configuration
 */
export interface PasskeyConfig {
  /** Enable passkey authentication */
  enabled?: boolean
  /**
   * Relying Party ID (domain without protocol or port)
   * @example "example.com"
   */
  rpId?: string
  /**
   * Relying Party Name (human-readable app name)
   * @example "My Application"
   */
  rpName?: string
  /** Enable conditional UI (autofill) support (default: true) */
  conditionalUI?: boolean
}

/**
 * Two-factor authentication configuration
 */
export interface TwoFactorConfig {
  /** Enable 2FA support */
  enabled?: boolean
  /** Enable TOTP (authenticator app) support (default: true) */
  totp?: boolean
  /** Number of backup codes to generate (default: 10) */
  backupCodesCount?: number
  /** Enable trusted device management (default: true) */
  trustedDevices?: boolean
  /** Trusted device expiry in days (default: 30) */
  trustedDeviceExpiry?: number
  /** Issuer name for TOTP (shown in authenticator apps) */
  issuer?: string
}

/**
 * Magic link authentication configuration
 */
export interface MagicLinkConfig {
  /** Enable magic link authentication */
  enabled?: boolean
  /** Link expiry time in seconds (default: 300 = 5 minutes) */
  expiresIn?: number
}

/**
 * Phone/SMS authentication configuration
 */
export interface PhoneConfig {
  /** Enable phone/SMS authentication */
  enabled?: boolean
  /** SMS provider (e.g., 'twilio') */
  provider?: string
}

/**
 * Authentication methods configuration
 */
export interface AuthMethodsConfig {
  /**
   * Email/password authentication
   * Set to `true` for defaults, `false` to disable, or configure options
   */
  password?: boolean | PasswordConfig
  /**
   * OAuth providers configuration
   */
  oauth?: OAuthConfig
  /**
   * Passkey (WebAuthn) authentication
   * Set to `true` for defaults, `false` to disable, or configure options
   */
  passkeys?: boolean | PasskeyConfig
  /**
   * Two-factor authentication
   * Set to `true` for defaults, `false` to disable, or configure options
   */
  twoFactor?: boolean | TwoFactorConfig
  /**
   * Magic link authentication
   * Set to `true` for defaults, `false` to disable, or configure options
   */
  magicLink?: boolean | MagicLinkConfig
  /**
   * Phone/SMS authentication
   * Set to `true` for defaults, `false` to disable, or configure options
   */
  phone?: boolean | PhoneConfig
}

// ============================================================================
// Team Configuration
// ============================================================================

/**
 * Team (organization) configuration
 */
export interface TeamsConfig {
  /**
   * Allow users to create new teams
   * Multi-tenant: true by default
   * Single-tenant/Personal: false by default
   */
  allowCreate?: boolean
  /**
   * Maximum number of teams per user (default: 5)
   * Only applies to multi-tenant mode
   */
  limit?: number
  /**
   * Maximum members per team (default: 100)
   */
  memberLimit?: number
  /**
   * Require email invitation to join team (default: true)
   */
  requireInvite?: boolean
  /**
   * Invitation link expiry in seconds (default: 172800 = 48 hours)
   */
  invitationExpiry?: number
  /**
   * Require email verification before accepting invitations (default: false)
   */
  requireEmailVerification?: boolean
  /**
   * Default role for new members (default: 'member')
   */
  defaultRole?: 'member' | 'admin'
  /**
   * Available roles in the team
   */
  roles?: TeamRole[]
}

/**
 * Team role definition
 */
export interface TeamRole {
  /** Role identifier */
  id: string
  /** Display name */
  name: string
  /** Role permissions */
  permissions?: string[]
}

// ============================================================================
// Billing Configuration
// ============================================================================

/**
 * Stripe configuration
 */
export interface StripeConfig {
  /** Stripe publishable key */
  publishableKey: string
  /** Stripe secret key (server-only) */
  secretKey: string
  /** Stripe webhook secret */
  webhookSecret: string
  /** Subscription plans */
  plans?: StripePlan[]
  /** Trial period in days (default: 0) */
  trialDays?: number
  /** Enable customer portal (default: true) */
  customerPortal?: boolean
}

/**
 * Stripe subscription plan
 */
export interface StripePlan {
  /** Plan identifier */
  id: string
  /** Display name */
  name: string
  /** Description */
  description?: string
  /** Price ID from Stripe */
  stripePriceId: string
  /** Price amount (for display) */
  price: number
  /** Currency (default: 'usd') */
  currency?: string
  /** Billing interval */
  interval: 'month' | 'year'
  /** Plan features (for display) */
  features?: string[]
}

/**
 * Billing configuration
 */
export interface BillingConfig {
  /** Enable billing features */
  enabled?: boolean
  /** Billing provider (currently only 'stripe' supported) */
  provider?: 'stripe'
  /** Stripe configuration */
  stripe?: StripeConfig
}

// ============================================================================
// UI Configuration
// ============================================================================

/**
 * Redirect URLs configuration
 */
export interface RedirectConfig {
  /** Redirect after successful login (default: '/dashboard') */
  afterLogin?: string
  /** Redirect after logout (default: '/') */
  afterLogout?: string
  /** Redirect after registration (default: '/dashboard') */
  afterRegister?: string
  /** Redirect for unauthenticated users (default: '/auth/login') */
  unauthenticated?: string
  /** Redirect for already authenticated users on auth pages (default: '/dashboard') */
  authenticated?: string
}

/**
 * UI configuration
 */
export interface UIConfig {
  /**
   * UI theme preset
   * 'default': Full-featured auth UI
   * 'minimal': Minimal, unstyled components
   */
  theme?: 'default' | 'minimal'
  /** Redirect URLs */
  redirects?: RedirectConfig
  /** Show "Remember me" checkbox on login (default: true) */
  showRememberMe?: boolean
  /** Show social login buttons (default: true if oauth configured) */
  showSocialLogin?: boolean
  /** Enable dark mode support (default: true) */
  darkMode?: boolean
}

// ============================================================================
// Session Configuration
// ============================================================================

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Session expiry in seconds (default: 604800 = 7 days) */
  expiresIn?: number
  /** Refresh session on activity (default: true) */
  updateAge?: number
  /** Cookie name (default: 'better-auth.session_token') */
  cookieName?: string
  /** Cookie secure flag (default: true in production) */
  secure?: boolean
  /** Cookie same-site attribute (default: 'lax') */
  sameSite?: 'strict' | 'lax' | 'none'
}

// ============================================================================
// Main Configuration Interface
// ============================================================================

/**
 * Authentication mode
 *
 * - `multi-tenant`: Users can create/join multiple organizations
 * - `single-tenant`: One organization, multiple users (team/company app)
 * - `personal`: One organization per user (personal productivity app)
 */
export type AuthMode = 'multi-tenant' | 'single-tenant' | 'personal'

/**
 * Main @crouton/auth configuration interface
 *
 * @example
 * ```typescript
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   crouton: {
 *     auth: {
 *       mode: 'multi-tenant',
 *       methods: {
 *         password: true,
 *         oauth: {
 *           github: { clientId: '...', clientSecret: '...' }
 *         },
 *         passkeys: true,
 *         twoFactor: true
 *       },
 *       billing: {
 *         enabled: true,
 *         provider: 'stripe'
 *       }
 *     }
 *   }
 * })
 * ```
 */
export interface CroutonAuthConfig {
  /**
   * Authentication mode
   *
   * - `multi-tenant`: Users can create/join multiple organizations (SaaS apps)
   * - `single-tenant`: One organization, multiple users (team/company apps)
   * - `personal`: One organization per user (personal productivity apps)
   *
   * @default 'personal'
   */
  mode: AuthMode

  /**
   * Authentication methods configuration
   */
  methods?: AuthMethodsConfig

  /**
   * Team (organization) configuration
   */
  teams?: TeamsConfig

  /**
   * Billing configuration
   */
  billing?: BillingConfig

  /**
   * UI configuration
   */
  ui?: UIConfig

  /**
   * Session configuration
   */
  session?: SessionConfig

  /**
   * Enable debug mode (default: false)
   * Enables verbose logging for debugging
   */
  debug?: boolean
}

// ============================================================================
// Runtime Configuration Types
// ============================================================================

/**
 * Server-side auth runtime config
 */
export interface AuthServerRuntimeConfig {
  /** BETTER_AUTH_SECRET - session encryption key */
  secret: string
  /** BETTER_AUTH_URL - application base URL */
  baseUrl: string
  /** OAuth provider secrets (server-only) */
  oauth?: {
    [provider: string]: {
      clientSecret: string
    }
  }
  /** Stripe secrets (server-only) */
  stripe?: {
    secretKey: string
    webhookSecret: string
  }
}

/**
 * Public auth runtime config
 */
export interface AuthPublicRuntimeConfig {
  crouton: {
    auth: CroutonAuthConfig
  }
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Resolve boolean | Config to Config
 */
export type ResolveConfig<T> = T extends boolean ? undefined : T

/**
 * Check if a method is enabled
 */
export function isMethodEnabled(
  method: boolean | object | undefined
): boolean {
  if (method === undefined) return false
  if (typeof method === 'boolean') return method
  return (method as { enabled?: boolean }).enabled !== false
}

/**
 * Get method config (returns undefined if disabled or boolean)
 */
export function getMethodConfig<T extends object>(
  method: boolean | T | undefined
): T | undefined {
  if (method === undefined || typeof method === 'boolean') return undefined
  return method
}
