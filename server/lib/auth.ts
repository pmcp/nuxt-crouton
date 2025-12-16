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
import { organization, twoFactor } from 'better-auth/plugins'
import { passkey } from '@better-auth/passkey'
import { stripe as stripePlugin } from '@better-auth/stripe'
import Stripe from 'stripe'
import { sql } from 'drizzle-orm'
import type { BetterAuthOptions } from 'better-auth'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type {
  CroutonAuthConfig,
  SessionConfig,
  PasswordConfig,
  PasskeyConfig,
  TwoFactorConfig,
  OAuthConfig,
  GitHubOAuthConfig,
  GoogleOAuthConfig,
  DiscordOAuthConfig,
  OAuthProviderConfig,
  BillingConfig,
  StripeConfig,
  StripePlan,
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
  /** Stripe secret key (required if billing is enabled) */
  stripeSecretKey?: string
  /** Stripe webhook secret (required if billing is enabled) */
  stripeWebhookSecret?: string
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
    stripeSecretKey,
    stripeWebhookSecret,
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

    // Plugins - Organization (Teams), Passkey, 2FA, and Stripe support
    plugins: buildPlugins(config, baseURL, stripeSecretKey, stripeWebhookSecret),

    // Database hooks for single-tenant mode (auto-add users to default org)
    databaseHooks: buildDatabaseHooks(config, db),
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
// Mode-Specific Database Hooks (Single-Tenant & Personal)
// ============================================================================

/**
 * Build database hooks for single-tenant and personal modes
 *
 * These hooks automatically:
 *
 * **Single-Tenant Mode:**
 * 1. Create the default organization on first user signup (lazy creation)
 * 2. Add new users to the default organization
 * 3. Set the default organization as active for new sessions
 *
 * **Personal Mode:**
 * 1. Create a personal organization for each new user on signup
 * 2. Make the user the owner of their personal organization
 * 3. Set the personal organization as active for new sessions
 *
 * @param config - @crouton/auth configuration
 * @param db - Drizzle database instance
 * @returns Database hooks configuration or undefined if not single-tenant/personal
 */
function buildDatabaseHooks(
  config: CroutonAuthConfig,
  db: DrizzleD1Database<Record<string, unknown>>
): BetterAuthOptions['databaseHooks'] {
  // Only add hooks for single-tenant or personal mode
  if (config.mode !== 'single-tenant' && config.mode !== 'personal') {
    return undefined
  }

  // Single-tenant mode hooks
  if (config.mode === 'single-tenant') {
    const defaultTeamId = config.defaultTeamId ?? 'default'
    const appName = config.appName ?? 'Default Workspace'

    return {
      user: {
        create: {
          after: async (user) => {
            // 1. Ensure default org exists (lazy creation)
            await ensureDefaultOrgExists(db, defaultTeamId, appName)

            // 2. Add user to default org as member
            await addUserToDefaultOrg(db, user.id, defaultTeamId)

            if (config.debug) {
              console.log(`[crouton/auth] User ${user.email} added to default org (single-tenant)`)
            }
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            // Set active organization to default for new sessions in single-tenant mode
            await setSessionActiveOrg(db, session.id, defaultTeamId)

            if (config.debug) {
              console.log(`[crouton/auth] Session ${session.id} set to default org (single-tenant)`)
            }
          },
        },
      },
    }
  }

  // Personal mode hooks
  return {
    user: {
      create: {
        after: async (user) => {
          // Create a personal organization for the user
          const orgId = await createPersonalOrg(db, user.id, user.name, user.email, config.appName)

          if (config.debug) {
            console.log(`[crouton/auth] Personal org ${orgId} created for user ${user.email} (personal mode)`)
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          // Get user's personal organization and set it as active
          const personalOrgId = await getUserPersonalOrgId(db, session.userId)

          if (personalOrgId) {
            await setSessionActiveOrg(db, session.id, personalOrgId)

            if (config.debug) {
              console.log(`[crouton/auth] Session ${session.id} set to personal org ${personalOrgId} (personal mode)`)
            }
          }
        },
      },
    },
  }
}

/**
 * Ensure the default organization exists (lazy creation)
 *
 * Creates the default organization if it doesn't exist.
 * This is called on first user signup in single-tenant mode.
 *
 * @param db - Drizzle database instance
 * @param defaultTeamId - Default team ID from config
 * @param appName - Application name for the default org
 */
async function ensureDefaultOrgExists(
  db: DrizzleD1Database<Record<string, unknown>>,
  defaultTeamId: string,
  appName: string
): Promise<void> {
  // Check if org exists
  const result = await db.all(sql`
    SELECT id FROM organization WHERE id = ${defaultTeamId}
  `)

  if (result.length === 0) {
    // Create default organization with isDefault flag (Task 6.2)
    const now = new Date().toISOString()
    await db.run(sql`
      INSERT INTO organization (id, name, slug, isDefault, personal, createdAt)
      VALUES (${defaultTeamId}, ${appName}, 'default', 1, 0, ${now})
    `)
    console.log('[crouton/auth] Created default organization for single-tenant mode')
  }
}

/**
 * Add a user to the default organization
 *
 * Creates a member record for the user in the default organization.
 * Idempotent - checks if membership already exists before inserting.
 *
 * @param db - Drizzle database instance
 * @param userId - User ID to add
 * @param defaultTeamId - Default team ID from config
 */
async function addUserToDefaultOrg(
  db: DrizzleD1Database<Record<string, unknown>>,
  userId: string,
  defaultTeamId: string
): Promise<void> {
  // Check if already a member (idempotent)
  const existing = await db.all(sql`
    SELECT id FROM member WHERE organizationId = ${defaultTeamId} AND userId = ${userId}
  `)

  if (existing.length === 0) {
    const memberId = crypto.randomUUID()
    const now = new Date().toISOString()
    await db.run(sql`
      INSERT INTO member (id, organizationId, userId, role, createdAt)
      VALUES (${memberId}, ${defaultTeamId}, ${userId}, 'member', ${now})
    `)
  }
}

/**
 * Set the active organization for a session
 *
 * Updates the session record to set the active organization.
 *
 * @param db - Drizzle database instance
 * @param sessionId - Session ID to update
 * @param orgId - Organization ID to set as active
 */
async function setSessionActiveOrg(
  db: DrizzleD1Database<Record<string, unknown>>,
  sessionId: string,
  orgId: string
): Promise<void> {
  await db.run(sql`
    UPDATE session SET activeOrganizationId = ${orgId} WHERE id = ${sessionId}
  `)
}

// ============================================================================
// Personal Mode: Helper Functions
// ============================================================================

/**
 * Create a personal organization for a user
 *
 * Creates an organization specifically for personal mode where:
 * - Each user has exactly one organization
 * - The user is automatically the owner
 * - The organization is marked with personal=true and ownerId (Task 6.2)
 *
 * @param db - Drizzle database instance
 * @param userId - User ID (owner)
 * @param userName - User's name for workspace naming
 * @param userEmail - User's email (fallback for naming)
 * @param _appName - Application name (reserved for metadata)
 * @returns The created organization ID
 */
async function createPersonalOrg(
  db: DrizzleD1Database<Record<string, unknown>>,
  userId: string,
  userName: string | null,
  userEmail: string,
  _appName?: string
): Promise<string> {
  const orgId = crypto.randomUUID()
  const now = new Date().toISOString()

  // Create organization name: "John's Workspace" or "john@email.com's Workspace"
  const displayName = userName || userEmail.split('@')[0]
  const orgName = `${displayName}'s Workspace`

  // Use user ID as slug for uniqueness (slugified)
  const slug = `personal-${userId.substring(0, 8)}`

  // Create the organization with personal and ownerId columns (Task 6.2)
  await db.run(sql`
    INSERT INTO organization (id, name, slug, personal, isDefault, ownerId, createdAt)
    VALUES (${orgId}, ${orgName}, ${slug}, 1, 0, ${userId}, ${now})
  `)

  // Add user as owner (member with 'owner' role)
  const memberId = crypto.randomUUID()
  await db.run(sql`
    INSERT INTO member (id, organizationId, userId, role, createdAt)
    VALUES (${memberId}, ${orgId}, ${userId}, 'owner', ${now})
  `)

  console.log(`[crouton/auth] Created personal organization "${orgName}" for user (personal mode)`)

  return orgId
}

/**
 * Get the user's personal organization ID
 *
 * In personal mode, each user has exactly one organization where they are the owner.
 * Uses the ownerId column for efficient lookup (Task 6.2).
 *
 * @param db - Drizzle database instance
 * @param userId - User ID to find personal org for
 * @returns Organization ID or null if not found
 */
async function getUserPersonalOrgId(
  db: DrizzleD1Database<Record<string, unknown>>,
  userId: string
): Promise<string | null> {
  // Find personal organization by ownerId (Task 6.2 - indexed column)
  const result = await db.all(sql`
    SELECT id FROM organization
    WHERE personal = 1 AND ownerId = ${userId}
    LIMIT 1
  `)

  if (result.length === 0) {
    return null
  }

  return (result[0] as { id: string }).id
}

// ============================================================================
// Plugin Configuration
// ============================================================================

/**
 * Build plugins array based on @crouton/auth configuration
 *
 * Always includes: organization (teams)
 * Conditionally includes: passkey (if enabled), twoFactor (if enabled), stripe (if billing enabled)
 *
 * @param config - @crouton/auth configuration
 * @param baseURL - Application base URL
 * @param stripeSecretKey - Stripe secret key (required if billing enabled)
 * @param stripeWebhookSecret - Stripe webhook secret (required if billing enabled)
 * @returns Array of Better Auth plugins
 */
function buildPlugins(
  config: CroutonAuthConfig,
  baseURL: string,
  stripeSecretKey?: string,
  stripeWebhookSecret?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins: any[] = [
    // Organization plugin is always enabled (teams support)
    organization(buildOrganizationConfig(config)),
  ]

  // Conditionally add passkey plugin
  const passkeyPluginConfig = buildPasskeyConfig(config.methods?.passkeys, baseURL)
  if (passkeyPluginConfig) {
    plugins.push(passkey(passkeyPluginConfig))
  }

  // Conditionally add 2FA plugin
  const twoFactorPluginConfig = buildTwoFactorConfig(config.methods?.twoFactor, config.appName)
  if (twoFactorPluginConfig) {
    plugins.push(twoFactor(twoFactorPluginConfig))
  }

  // Conditionally add Stripe billing plugin
  const stripePluginConfig = buildStripePluginConfig(
    config.billing,
    config.mode,
    stripeSecretKey,
    stripeWebhookSecret,
    config.debug
  )
  if (stripePluginConfig) {
    plugins.push(stripePluginConfig)
  }

  return plugins
}

// ============================================================================
// Passkey (WebAuthn) Configuration
// ============================================================================

/**
 * Build passkey plugin configuration from @crouton/auth config
 *
 * Passkeys provide passwordless authentication using WebAuthn.
 * Supports:
 * - Platform authenticators (fingerprint, Face ID, Windows Hello)
 * - Cross-platform authenticators (hardware security keys)
 * - Conditional UI (autofill support)
 *
 * @param passkeyConfig - Passkey configuration from @crouton/auth
 * @param baseURL - Application base URL for origin
 * @returns Passkey plugin configuration or null if disabled
 */
function buildPasskeyConfig(
  passkeyConfig: boolean | PasskeyConfig | undefined,
  baseURL: string
): PasskeyPluginOptions | null {
  // Check if passkeys are enabled
  if (passkeyConfig === false || passkeyConfig === undefined) {
    return null
  }

  // Parse base URL to get origin and default rpID
  const url = new URL(baseURL)
  const origin = url.origin
  const defaultRpId = url.hostname

  // Use defaults if just `true`
  if (passkeyConfig === true) {
    return {
      rpID: defaultRpId,
      rpName: 'Application',
      origin,
    }
  }

  // Custom passkey configuration
  const customConfig = passkeyConfig as PasskeyConfig

  // If explicitly disabled via config object
  if (customConfig.enabled === false) {
    return null
  }

  return {
    rpID: customConfig.rpId ?? defaultRpId,
    rpName: customConfig.rpName ?? 'Application',
    origin,
    // Additional WebAuthn options for credential creation
    authenticatorSelection: {
      // Default to platform authenticators for better UX (fingerprint, Face ID)
      // Users can specify 'cross-platform' for hardware keys
      authenticatorAttachment: undefined, // Allow both platform and cross-platform
      // Require resident key for usernameless authentication
      residentKey: 'preferred',
      // Require user verification (biometric or PIN)
      userVerification: 'preferred',
    },
  }
}

/**
 * Passkey plugin options type
 */
interface PasskeyPluginOptions {
  /** Relying Party ID - typically the domain (e.g., 'example.com') */
  rpID: string
  /** Relying Party Name - human-readable app name */
  rpName: string
  /** Origin URL - server URL without trailing slash */
  origin: string
  /** Authenticator selection criteria */
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform'
    residentKey?: 'required' | 'preferred' | 'discouraged'
    userVerification?: 'required' | 'preferred' | 'discouraged'
  }
}

// ============================================================================
// Two-Factor Authentication (2FA) Configuration
// ============================================================================

/**
 * Build 2FA plugin configuration from @crouton/auth config
 *
 * Two-factor authentication adds an extra layer of security by requiring
 * a second verification step during login.
 *
 * Supports:
 * - TOTP (Time-based One-Time Password) via authenticator apps
 * - Backup codes for account recovery
 * - Trusted device management (skip 2FA on trusted devices)
 *
 * @param twoFactorConfigInput - 2FA configuration from @crouton/auth
 * @param appName - Application name for TOTP issuer
 * @returns 2FA plugin configuration or null if disabled
 */
function buildTwoFactorConfig(
  twoFactorConfigInput: boolean | TwoFactorConfig | undefined,
  appName?: string
): TwoFactorPluginOptions | null {
  // Check if 2FA is enabled
  if (twoFactorConfigInput === false || twoFactorConfigInput === undefined) {
    return null
  }

  // Use defaults if just `true`
  if (twoFactorConfigInput === true) {
    return {
      issuer: appName ?? 'Application',
      // TOTP defaults
      totpOptions: {
        digits: 6,
        period: 30,
      },
      // Backup codes defaults
      backupCodeOptions: {
        amount: 10,
        length: 10,
      },
    }
  }

  // Custom 2FA configuration
  const customConfig = twoFactorConfigInput as TwoFactorConfig

  // If explicitly disabled via config object
  if (customConfig.enabled === false) {
    return null
  }

  // Build TOTP options if enabled (default: true)
  const totpEnabled = customConfig.totp !== false
  const totpOptions = totpEnabled
    ? {
        digits: 6,
        period: 30,
      }
    : undefined

  // Build backup code options
  const backupCodeOptions = {
    amount: customConfig.backupCodesCount ?? 10,
    length: 10,
  }

  return {
    issuer: customConfig.issuer ?? appName ?? 'Application',
    // Only include TOTP options if enabled
    ...(totpOptions && { totpOptions }),
    // Always include backup codes
    backupCodeOptions,
    // Skip verification on enable is false by default for security
    skipVerificationOnEnable: false,
  }
}

/**
 * 2FA plugin options type
 */
interface TwoFactorPluginOptions {
  /** Issuer name shown in authenticator apps (e.g., "My App") */
  issuer: string
  /**
   * TOTP (Time-based One-Time Password) configuration
   * If undefined, TOTP is disabled
   */
  totpOptions?: {
    /** Number of digits in the code (default: 6) */
    digits: number
    /** Time period in seconds for code validity (default: 30) */
    period: number
  }
  /**
   * Backup codes configuration for account recovery
   */
  backupCodeOptions?: {
    /** Number of backup codes to generate (default: 10) */
    amount: number
    /** Length of each backup code (default: 10) */
    length: number
  }
  /**
   * Skip verification when enabling 2FA
   * Should be false for security (default: false)
   */
  skipVerificationOnEnable?: boolean
  /**
   * Custom table name for 2FA data (default: "twoFactor")
   */
  twoFactorTable?: string
}

// ============================================================================
// 2FA Utility Functions
// ============================================================================

/**
 * Check if 2FA is enabled in the configuration
 *
 * @param config - @crouton/auth configuration
 * @returns True if 2FA is enabled
 */
export function isTwoFactorEnabled(config: CroutonAuthConfig): boolean {
  const twoFactorConfig = config.methods?.twoFactor
  if (twoFactorConfig === undefined || twoFactorConfig === false) {
    return false
  }
  if (twoFactorConfig === true) {
    return true
  }
  return twoFactorConfig.enabled !== false
}

/**
 * Get 2FA configuration details for UI display
 *
 * @param config - @crouton/auth configuration
 * @returns 2FA info for UI or null if disabled
 */
export function getTwoFactorInfo(config: CroutonAuthConfig): TwoFactorInfo | null {
  if (!isTwoFactorEnabled(config)) {
    return null
  }

  const twoFactorConfig = config.methods?.twoFactor
  const customConfig = typeof twoFactorConfig === 'object' ? twoFactorConfig : {}

  return {
    enabled: true,
    hasTotp: customConfig.totp !== false,
    hasTrustedDevices: customConfig.trustedDevices !== false,
    backupCodesCount: customConfig.backupCodesCount ?? 10,
    issuer: customConfig.issuer ?? config.appName ?? 'Application',
    trustedDeviceExpiryDays: customConfig.trustedDeviceExpiry ?? 30,
  }
}

/**
 * 2FA info for UI display
 */
export interface TwoFactorInfo {
  /** Whether 2FA is enabled */
  enabled: boolean
  /** Whether TOTP (authenticator app) is available */
  hasTotp: boolean
  /** Whether trusted device management is available */
  hasTrustedDevices: boolean
  /** Number of backup codes generated */
  backupCodesCount: number
  /** Issuer name for authenticator apps */
  issuer: string
  /** How many days a trusted device stays trusted */
  trustedDeviceExpiryDays: number
}

// ============================================================================
// Stripe Billing Plugin Configuration
// ============================================================================

/**
 * Build Stripe billing plugin configuration
 *
 * The Stripe plugin handles:
 * - Subscription management (create, cancel, restore)
 * - Checkout sessions for subscription upgrades
 * - Billing portal for customer self-service
 * - Webhook handling for subscription lifecycle events
 *
 * Supports two billing models:
 * - User-based billing (personal mode): Each user has their own subscription
 * - Organization-based billing (multi-tenant/single-tenant): Subscriptions tied to teams
 *
 * @param billingConfig - Billing configuration from @crouton/auth
 * @param mode - Auth mode (affects billing reference type)
 * @param stripeSecretKey - Stripe secret key
 * @param stripeWebhookSecret - Stripe webhook secret
 * @param debug - Enable debug logging
 * @returns Stripe plugin instance or null if billing not enabled
 */
function buildStripePluginConfig(
  billingConfig: BillingConfig | undefined,
  mode: CroutonAuthConfig['mode'],
  stripeSecretKey?: string,
  stripeWebhookSecret?: string,
  debug?: boolean
): ReturnType<typeof stripePlugin> | null {
  // Check if billing is enabled
  if (!billingConfig?.enabled) {
    return null
  }

  // Validate required secrets
  if (!stripeSecretKey) {
    console.warn('[crouton/auth] Billing enabled but STRIPE_SECRET_KEY not provided. Billing will be disabled.')
    return null
  }

  if (!stripeWebhookSecret) {
    console.warn('[crouton/auth] Billing enabled but STRIPE_WEBHOOK_SECRET not provided. Webhooks will not be verified.')
  }

  // Get Stripe configuration
  const stripeConfig = billingConfig.stripe
  if (!stripeConfig) {
    console.warn('[crouton/auth] Billing enabled but stripe config not provided. Billing will be disabled.')
    return null
  }

  // Create Stripe client instance
  const stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2025-04-30.basil', // Use latest API version
    typescript: true,
  })

  // Build plans configuration
  const plans = buildStripePlansConfig(stripeConfig.plans, stripeConfig.trialDays)

  // Build and return the Stripe plugin
  return stripePlugin({
    // Stripe client instance (required)
    stripeClient,

    // Webhook signing secret (required for webhook verification)
    stripeWebhookSecret: stripeWebhookSecret || '',

    // Auto-create Stripe customer when user signs up
    createCustomerOnSignUp: true,

    // Customize customer creation
    getCustomerCreateParams: async ({ user }) => ({
      params: {
        email: user.email,
        name: user.name ?? undefined,
        metadata: {
          userId: user.id,
          // In personal mode, user is the billing entity
          // In multi-tenant/single-tenant, organization is the billing entity
          billingMode: mode === 'personal' ? 'user' : 'organization',
        },
      },
    }),

    // Subscription configuration
    subscription: {
      enabled: true,
      plans,

      // Authorization for reference-based subscriptions (organization billing)
      // This is called to verify a user can manage billing for an organization
      authorizeReference: mode === 'personal' ? undefined : async ({ referenceId, action, user }) => {
        // For organization-based billing, we need to verify the user is an owner/admin
        // This will be implemented by the actual auth instance
        // For now, we log the attempt and return true (will be secured in Task 2.7/2.8)
        if (debug) {
          console.log(`[crouton/auth] Authorizing ${action} for reference ${referenceId} by user ${user.id}`)
        }
        // TODO: Implement proper authorization check via organization membership
        // This should check if user is owner/admin of the organization
        return true
      },

      // Lifecycle hooks for subscription events
      onSubscriptionComplete: async ({ event, subscription, plan }) => {
        if (debug) {
          console.log(`[crouton/auth] Subscription created:`, {
            subscriptionId: subscription.id,
            plan: plan?.name,
            referenceId: subscription.referenceId,
            stripeSubscriptionId: event.data.object.id,
          })
        }
      },

      onSubscriptionUpdate: async ({ event, subscription }) => {
        if (debug) {
          console.log(`[crouton/auth] Subscription updated:`, {
            subscriptionId: subscription.id,
            status: subscription.status,
            stripeSubscriptionId: event.data.object.id,
          })
        }
      },

      onSubscriptionCancel: async ({ event, subscription, cancellationDetails }) => {
        if (debug) {
          console.log(`[crouton/auth] Subscription canceled:`, {
            subscriptionId: subscription.id,
            reason: cancellationDetails?.reason,
            feedback: cancellationDetails?.feedback,
            stripeSubscriptionId: event.data.object.id,
          })
        }
      },

      onSubscriptionDeleted: async ({ event, subscription }) => {
        if (debug) {
          console.log(`[crouton/auth] Subscription deleted:`, {
            subscriptionId: subscription.id,
            stripeSubscriptionId: event.data.object.id,
          })
        }
      },
    },

    // Handle any Stripe webhook event
    onEvent: async (event) => {
      if (debug) {
        console.log(`[crouton/auth] Stripe webhook received: ${event.type}`)
      }

      // Handle specific events that aren't covered by subscription hooks
      switch (event.type) {
        case 'invoice.paid':
          if (debug) {
            console.log(`[crouton/auth] Invoice paid:`, event.data.object.id)
          }
          break
        case 'invoice.payment_failed':
          if (debug) {
            console.log(`[crouton/auth] Invoice payment failed:`, event.data.object.id)
          }
          break
        // Add more event handlers as needed
      }
    },
  })
}

/**
 * Build Stripe plans configuration from @crouton/auth config
 *
 * Converts our StripePlan format to Better Auth's expected format
 *
 * @param plans - Array of plan configurations
 * @param defaultTrialDays - Default trial period for all plans
 * @returns Plans configuration for Better Auth Stripe plugin
 */
function buildStripePlansConfig(
  plans: StripePlan[] | undefined,
  defaultTrialDays?: number
): StripePluginPlan[] {
  if (!plans || plans.length === 0) {
    return []
  }

  return plans.map((plan) => {
    const basePlan: StripePluginPlan = {
      name: plan.id,
      priceId: plan.stripePriceId,
      // Add limits as custom metadata for the plan
      limits: {
        displayName: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency ?? 'usd',
        interval: plan.interval,
        features: plan.features ?? [],
      },
    }

    // Add trial configuration if specified
    if (defaultTrialDays && defaultTrialDays > 0) {
      basePlan.freeTrial = {
        days: defaultTrialDays,
      }
    }

    return basePlan
  })
}

/**
 * Better Auth Stripe plugin plan type
 */
interface StripePluginPlan {
  /** Plan identifier (used in API calls) */
  name: string
  /** Stripe Price ID */
  priceId?: string
  /** Stripe Price lookup key (alternative to priceId) */
  lookupKey?: string
  /** Annual discount price ID */
  annualDiscountPriceId?: string
  /** Plan limits/metadata */
  limits?: Record<string, unknown>
  /** Plan group for categorization */
  group?: string
  /** Free trial configuration */
  freeTrial?: {
    days: number
    onTrialStart?: (subscription: SubscriptionData) => Promise<void>
    onTrialEnd?: (data: { subscription: SubscriptionData }, ctx: unknown) => Promise<void>
    onTrialExpired?: (subscription: SubscriptionData, ctx: unknown) => Promise<void>
  }
}

/**
 * Subscription data type for hooks
 */
interface SubscriptionData {
  id: string
  plan: string
  referenceId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: string
  periodStart: Date
  periodEnd: Date
  cancelAtPeriodEnd: boolean
  seats?: number
  trialStart?: Date
  trialEnd?: Date
}

// ============================================================================
// Stripe Billing Utility Functions
// ============================================================================

/**
 * Check if billing is enabled in the configuration
 *
 * @param config - @crouton/auth configuration
 * @returns True if billing is enabled and properly configured
 */
export function isBillingEnabled(config: CroutonAuthConfig): boolean {
  const billingConfig = config.billing
  if (!billingConfig?.enabled) {
    return false
  }
  // Also need Stripe configuration
  return !!billingConfig.stripe?.secretKey || !!billingConfig.stripe?.publishableKey
}

/**
 * Get billing configuration details for UI display
 *
 * @param config - @crouton/auth configuration
 * @returns Billing info for UI or null if disabled
 */
export function getBillingInfo(config: CroutonAuthConfig): BillingInfo | null {
  if (!isBillingEnabled(config)) {
    return null
  }

  const billingConfig = config.billing!
  const stripeConfig = billingConfig.stripe!

  return {
    enabled: true,
    provider: 'stripe',
    hasPlans: (stripeConfig.plans?.length ?? 0) > 0,
    plans: stripeConfig.plans?.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency ?? 'usd',
      interval: plan.interval,
      features: plan.features ?? [],
    })) ?? [],
    hasTrialPeriod: (stripeConfig.trialDays ?? 0) > 0,
    trialDays: stripeConfig.trialDays ?? 0,
    customerPortalEnabled: stripeConfig.customerPortal !== false,
    // Billing mode depends on auth mode
    billingMode: config.mode === 'personal' ? 'user' : 'organization',
  }
}

/**
 * Billing info for UI display
 */
export interface BillingInfo {
  /** Whether billing is enabled */
  enabled: boolean
  /** Billing provider (currently only 'stripe') */
  provider: 'stripe'
  /** Whether plans are configured */
  hasPlans: boolean
  /** Available subscription plans */
  plans: BillingPlanInfo[]
  /** Whether trial period is available */
  hasTrialPeriod: boolean
  /** Trial period in days */
  trialDays: number
  /** Whether customer portal is enabled */
  customerPortalEnabled: boolean
  /** Billing mode - user-based or organization-based */
  billingMode: 'user' | 'organization'
}

/**
 * Plan info for UI display
 */
export interface BillingPlanInfo {
  /** Plan identifier */
  id: string
  /** Display name */
  name: string
  /** Plan description */
  description?: string
  /** Price amount */
  price: number
  /** Currency code */
  currency: string
  /** Billing interval */
  interval: 'month' | 'year'
  /** Plan features list */
  features: string[]
}

/**
 * Get the Stripe publishable key from config
 *
 * This is safe to expose to the client as it's used for Stripe.js
 *
 * @param config - @crouton/auth configuration
 * @returns Stripe publishable key or null if not configured
 */
export function getStripePublishableKey(config: CroutonAuthConfig): string | null {
  return config.billing?.stripe?.publishableKey ?? null
}

/**
 * Subscription status values
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'unpaid'
  | 'paused'

/**
 * Check if a subscription status is considered "active" (has access)
 *
 * @param status - Subscription status
 * @returns True if the subscription grants access
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing'
}

/**
 * Check if a subscription is in a grace period (past_due but not yet canceled)
 *
 * @param status - Subscription status
 * @returns True if in grace period
 */
export function isSubscriptionInGracePeriod(status: SubscriptionStatus): boolean {
  return status === 'past_due'
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
// Passkey Utilities
// ============================================================================

/**
 * Check if passkeys are enabled in the configuration
 *
 * @param config - @crouton/auth configuration
 * @returns True if passkeys are enabled
 */
export function isPasskeyEnabled(config: CroutonAuthConfig): boolean {
  const passkeyConfig = config.methods?.passkeys
  if (passkeyConfig === undefined || passkeyConfig === false) {
    return false
  }
  if (passkeyConfig === true) {
    return true
  }
  return passkeyConfig.enabled !== false
}

/**
 * Get passkey configuration details for UI display
 *
 * @param config - @crouton/auth configuration
 * @returns Passkey info for UI or null if disabled
 */
export function getPasskeyInfo(config: CroutonAuthConfig): PasskeyInfo | null {
  if (!isPasskeyEnabled(config)) {
    return null
  }

  const passkeyConfig = config.methods?.passkeys
  const customConfig = typeof passkeyConfig === 'object' ? passkeyConfig : {}

  return {
    enabled: true,
    rpName: customConfig.rpName ?? 'Application',
    conditionalUI: customConfig.conditionalUI !== false,
    supportsAutofill: customConfig.conditionalUI !== false,
  }
}

/**
 * Passkey info for UI display
 */
export interface PasskeyInfo {
  /** Whether passkeys are enabled */
  enabled: boolean
  /** Relying Party Name (app name shown in browser dialogs) */
  rpName: string
  /** Whether conditional UI (autofill) is supported */
  conditionalUI: boolean
  /** Alias for conditionalUI */
  supportsAutofill: boolean
}

/**
 * Check if WebAuthn is supported in the current environment
 *
 * This is a helper for client-side code to check browser support.
 * Use this before showing passkey UI elements.
 *
 * @returns True if WebAuthn is available
 */
export function isWebAuthnSupported(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false
  }

  // Check for WebAuthn support
  return (
    typeof PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined'
  )
}

/**
 * Check if conditional UI (autofill) is available
 *
 * Conditional UI allows passkey authentication through browser autofill.
 * Not all browsers support this feature.
 *
 * @returns Promise resolving to true if conditional UI is available
 */
export async function isConditionalUIAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false
  }

  // Check for conditional mediation support
  if (typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') {
    return false
  }

  try {
    return await PublicKeyCredential.isConditionalMediationAvailable()
  } catch {
    return false
  }
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
