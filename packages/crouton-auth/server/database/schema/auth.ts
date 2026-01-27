/**
 * Better Auth Database Schema for Drizzle
 *
 * This schema defines all tables required by Better Auth and its plugins:
 * - Core: user, session, account, verification
 * - Organization Plugin: organization, member, invitation
 * - Passkey Plugin: passkey
 * - Two-Factor Plugin: twoFactor
 * - Stripe Plugin: subscription
 *
 * @see https://www.better-auth.com/docs/concepts/database
 * @see https://www.better-auth.com/docs/adapters/drizzle
 */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// Core Tables
// ============================================================================

/**
 * User table - Core user identity
 *
 * Stores basic user information and profile data.
 * Extended with stripeCustomerId for billing support.
 */
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  // Stripe extension
  stripeCustomerId: text('stripeCustomerId'),
  // Admin extension (crouton-admin package)
  /** Whether this user has super admin privileges */
  superAdmin: integer('superAdmin', { mode: 'boolean' }).notNull().default(false),
  /** Whether this user is banned from the platform */
  banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
  /** Reason for the ban (shown to user and admin) */
  bannedReason: text('bannedReason'),
  /** When the ban expires (null = permanent) */
  bannedUntil: integer('bannedUntil', { mode: 'timestamp' })
}, table => [
  index('user_email_idx').on(table.email),
  index('user_stripe_customer_idx').on(table.stripeCustomerId),
  index('user_super_admin_idx').on(table.superAdmin),
  index('user_banned_idx').on(table.banned)
])

/**
 * Session table - User sessions
 *
 * Tracks active user sessions with expiration and device info.
 * Extended with activeOrganizationId for organization context.
 */
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  // Organization extension - tracks active team context
  activeOrganizationId: text('activeOrganizationId'),
  // Impersonation extension (crouton-admin package)
  /** The original admin user ID when impersonating */
  impersonatingFrom: text('impersonatingFrom')
}, table => [
  index('session_user_idx').on(table.userId),
  index('session_token_idx').on(table.token),
  index('session_active_org_idx').on(table.activeOrganizationId),
  index('session_impersonating_idx').on(table.impersonatingFrom)
])

/**
 * Account table - OAuth and credential accounts
 *
 * Links external OAuth providers and stores credential (password) auth.
 * A user can have multiple accounts (e.g., Google + GitHub + password).
 */
export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  idToken: text('idToken'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date())
}, table => [
  index('account_user_idx').on(table.userId),
  index('account_provider_idx').on(table.providerId, table.accountId)
])

/**
 * Verification table - Email and other verifications
 *
 * Stores verification tokens for email verification, password reset, etc.
 */
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date())
}, table => [
  index('verification_identifier_idx').on(table.identifier)
])

// ============================================================================
// Organization Plugin Tables
// ============================================================================

/**
 * Organization table - Teams/workspaces
 *
 * Stores organization (team) data. Configuration flags control behavior:
 * - teams.allowCreate=true: Users can create multiple organizations
 * - teams.defaultTeamSlug: All users join this org on signup (isDefault = true)
 * - teams.autoCreateOnSignup: Auto-create personal workspace (personal = true)
 */
export const organization = sqliteTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  metadata: text('metadata'), // JSON string for additional data

  // Organization type flags
  /** True if this is a personal workspace (autoCreateOnSignup config) */
  personal: integer('personal', { mode: 'boolean' }).notNull().default(false),
  /** True if this is the default organization (defaultTeamSlug config) */
  isDefault: integer('isDefault', { mode: 'boolean' }).notNull().default(false),
  /** Owner user ID for personal workspaces */
  ownerId: text('ownerId'),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date())
}, table => [
  index('organization_slug_idx').on(table.slug),
  // Index for finding personal workspaces by owner
  index('organization_owner_idx').on(table.ownerId),
  // Index for finding the default organization (defaultTeamSlug config)
  index('organization_default_idx').on(table.isDefault),
  // Index for filtering personal workspaces (autoCreateOnSignup config)
  index('organization_personal_idx').on(table.personal)
])

/**
 * Member table - Organization membership
 *
 * Links users to organizations with roles (owner, admin, member).
 */
export const member = sqliteTable('member', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date())
}, table => [
  index('member_user_idx').on(table.userId),
  index('member_org_idx').on(table.organizationId),
  index('member_user_org_idx').on(table.userId, table.organizationId)
])

/**
 * Invitation table - Pending organization invitations
 *
 * Manages invitations to join organizations.
 */
export const invitation = sqliteTable('invitation', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  inviterId: text('inviterId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('pending'), // pending, accepted, rejected, expired
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  teamId: text('teamId') // Optional sub-team reference
}, table => [
  index('invitation_email_idx').on(table.email),
  index('invitation_org_idx').on(table.organizationId),
  index('invitation_status_idx').on(table.status)
])

// ============================================================================
// Passkey Plugin Table
// ============================================================================

/**
 * Passkey table - WebAuthn credentials
 *
 * Stores passkey/FIDO2 credentials for passwordless authentication.
 */
export const passkey = sqliteTable('passkey', {
  id: text('id').primaryKey(),
  name: text('name'),
  publicKey: text('publicKey').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  credentialID: text('credentialID').notNull().unique(),
  counter: integer('counter').notNull().default(0),
  deviceType: text('deviceType').notNull(),
  backedUp: integer('backedUp', { mode: 'boolean' }).notNull().default(false),
  transports: text('transports'), // JSON array of transport types
  createdAt: integer('createdAt', { mode: 'timestamp' }).$default(() => new Date()),
  aaguid: text('aaguid') // Authenticator GUID
}, table => [
  index('passkey_user_idx').on(table.userId),
  index('passkey_credential_idx').on(table.credentialID)
])

// ============================================================================
// Two-Factor Plugin Table
// ============================================================================

/**
 * Two-Factor table - 2FA configuration
 *
 * Stores TOTP secrets and backup codes for two-factor authentication.
 */
export const twoFactor = sqliteTable('twoFactor', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: text('backupCodes'), // JSON array of { code, used } objects
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date())
}, table => [
  index('two_factor_user_idx').on(table.userId)
])

// ============================================================================
// Stripe Plugin Table
// ============================================================================

/**
 * Subscription table - Stripe subscriptions
 *
 * Tracks subscription status for billing.
 * referenceId can be either userId (personal mode) or organizationId (team billing).
 */
export const subscription = sqliteTable('subscription', {
  id: text('id').primaryKey(),
  plan: text('plan').notNull(),
  referenceId: text('referenceId').notNull(), // userId or organizationId
  stripeCustomerId: text('stripeCustomerId'),
  stripeSubscriptionId: text('stripeSubscriptionId'),
  status: text('status').notNull().default('incomplete'),
  periodStart: integer('periodStart', { mode: 'timestamp' }),
  periodEnd: integer('periodEnd', { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer('cancelAtPeriodEnd', { mode: 'boolean' }).default(false),
  seats: integer('seats'),
  trialStart: integer('trialStart', { mode: 'timestamp' }),
  trialEnd: integer('trialEnd', { mode: 'timestamp' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date())
}, table => [
  index('subscription_reference_idx').on(table.referenceId),
  index('subscription_stripe_idx').on(table.stripeSubscriptionId),
  index('subscription_status_idx').on(table.status)
])

// ============================================================================
// Custom Domains Table
// ============================================================================

/**
 * Domain table - Custom domains for organizations
 *
 * Allows organizations to configure custom domains with DNS verification.
 * Supports multiple domains per organization with one primary domain.
 */
export const domain = sqliteTable('domain', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull().unique(),
  status: text('status').notNull().default('pending'), // 'pending', 'verified', 'failed'
  verificationToken: text('verificationToken').notNull(),
  verifiedAt: integer('verifiedAt', { mode: 'timestamp' }),
  isPrimary: integer('isPrimary', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date())
}, table => [
  index('domain_org_idx').on(table.organizationId),
  index('domain_domain_idx').on(table.domain),
  index('domain_status_idx').on(table.status)
])

// ============================================================================
// Scoped Access Token Table
// ============================================================================

/**
 * Scoped Access Token table - Resource-scoped authentication
 *
 * Provides lightweight, temporary authentication for resource-specific access.
 * Used for scenarios where a full user account isn't needed:
 * - Event helpers (POS/sales)
 * - Guest access to bookings
 * - Temporary attendee access
 *
 * Unlike Better Auth sessions, these tokens:
 * - Don't require a user account
 * - Are scoped to a specific resource (event, booking, etc.)
 * - Support PIN-based authentication (PIN managed by consuming package)
 * - Have configurable expiration
 */
export const scopedAccessToken = sqliteTable('scopedAccessToken', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  /** Organization/team the token belongs to */
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  /** Unique token string for authentication */
  token: text('token').notNull().unique(),
  /** Type of resource this token is scoped to (e.g., 'event', 'booking') */
  resourceType: text('resourceType').notNull(),
  /** ID of the specific resource */
  resourceId: text('resourceId').notNull(),
  /** Display name for the token holder (e.g., helper name, guest name) */
  displayName: text('displayName').notNull(),
  /** Role for authorization (e.g., 'helper', 'attendee', 'guest') */
  role: text('role').notNull().default('guest'),
  /** Whether this token is currently active */
  isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
  /** When this token expires */
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  /** Last activity timestamp */
  lastActiveAt: integer('lastActiveAt', { mode: 'timestamp' }),
  /** Additional metadata (JSON) */
  metadata: text('metadata'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date())
}, table => [
  index('scoped_access_token_idx').on(table.token),
  index('scoped_access_org_idx').on(table.organizationId),
  index('scoped_access_resource_idx').on(table.resourceType, table.resourceId),
  index('scoped_access_active_idx').on(table.isActive, table.expiresAt)
])

// ============================================================================
// Relations
// ============================================================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(member),
  passkeys: many(passkey),
  twoFactors: many(twoFactor),
  invitationsSent: many(invitation)
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  }),
  activeOrganization: one(organization, {
    fields: [session.activeOrganizationId],
    references: [organization.id]
  })
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}))

export const organizationRelations = relations(organization, ({ many, one }) => ({
  members: many(member),
  invitations: many(invitation),
  sessions: many(session),
  domains: many(domain),
  settings: one(teamSettings)
}))

export const memberRelations = relations(member, ({ one }) => ({
  user: one(user, {
    fields: [member.userId],
    references: [user.id]
  }),
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id]
  })
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id]
  }),
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id]
  })
}))

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id]
  })
}))

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id]
  })
}))

export const domainRelations = relations(domain, ({ one }) => ({
  organization: one(organization, {
    fields: [domain.organizationId],
    references: [organization.id]
  })
}))

export const scopedAccessTokenRelations = relations(scopedAccessToken, ({ one }) => ({
  organization: one(organization, {
    fields: [scopedAccessToken.organizationId],
    references: [organization.id]
  })
}))

// ============================================================================
// Type Exports
// ============================================================================

export type User = typeof user.$inferSelect
export type NewUser = typeof user.$inferInsert

export type Session = typeof session.$inferSelect
export type NewSession = typeof session.$inferInsert

export type Account = typeof account.$inferSelect
export type NewAccount = typeof account.$inferInsert

export type Verification = typeof verification.$inferSelect
export type NewVerification = typeof verification.$inferInsert

export type Organization = typeof organization.$inferSelect
export type NewOrganization = typeof organization.$inferInsert

export type Member = typeof member.$inferSelect
export type NewMember = typeof member.$inferInsert

export type Invitation = typeof invitation.$inferSelect
export type NewInvitation = typeof invitation.$inferInsert

export type Passkey = typeof passkey.$inferSelect
export type NewPasskey = typeof passkey.$inferInsert

export type TwoFactor = typeof twoFactor.$inferSelect
export type NewTwoFactor = typeof twoFactor.$inferInsert

export type Subscription = typeof subscription.$inferSelect
export type NewSubscription = typeof subscription.$inferInsert

export type Domain = typeof domain.$inferSelect
export type NewDomain = typeof domain.$inferInsert

export type ScopedAccessToken = typeof scopedAccessToken.$inferSelect
export type NewScopedAccessToken = typeof scopedAccessToken.$inferInsert

// ============================================================================
// Team Settings Table
// ============================================================================

/**
 * AI settings type for team-specific API keys and preferences
 * Keys are stored server-side only - never exposed to client
 */
export interface TeamAISettings {
  /** Anthropic API key (e.g., sk-ant-...) */
  anthropicApiKey?: string
  /** OpenAI API key (e.g., sk-...) */
  openaiApiKey?: string
  /** Default AI model for this team (e.g., claude-sonnet-4-20250514, gpt-4o) */
  defaultModel?: string
  /** Default AI provider: 'anthropic' | 'openai' */
  defaultProvider?: 'anthropic' | 'openai'
}

/**
 * Theme color options (Tailwind CSS colors)
 */
export type ThemePrimaryColor =
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green'
  | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo'
  | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'

export type ThemeNeutralColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'

export type ThemeRadius = 0 | 0.125 | 0.25 | 0.375 | 0.5

/**
 * Theme settings for team visual customization
 * Similar to Nuxt UI's theme picker
 */
export interface TeamThemeSettings {
  /** Primary color for buttons, links, and accents */
  primary?: ThemePrimaryColor
  /** Neutral color for backgrounds, borders, and text */
  neutral?: ThemeNeutralColor
  /** Border radius in rem (0 = sharp corners, 0.5 = fully rounded) */
  radius?: ThemeRadius
}

/**
 * Team settings table for translation overrides, AI configuration, and theme
 *
 * This table stores team-specific settings that take precedence over system defaults.
 * Includes translation overrides, AI API keys, and visual theme preferences.
 */
export const teamSettings = sqliteTable('team_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id')
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: 'cascade' }),
  /** Team-specific translation overrides by locale */
  translations: text('translations', { mode: 'json' }).$type<{
    [locale: string]: {
      [key: string]: string
    }
  }>(),
  /**
   * AI settings including API keys and preferences
   * SECURITY: This field is server-side only - never expose to client
   */
  aiSettings: text('ai_settings', { mode: 'json' }).$type<TeamAISettings>(),
  /**
   * Theme settings for team visual customization
   * Safe to expose to client - no sensitive data
   */
  themeSettings: text('theme_settings', { mode: 'json' }).$type<TeamThemeSettings>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
}, table => [
  index('team_settings_team_idx').on(table.teamId)
])

export const teamSettingsRelations = relations(teamSettings, ({ one }) => ({
  organization: one(organization, {
    fields: [teamSettings.teamId],
    references: [organization.id]
  })
}))

export type TeamSettings = typeof teamSettings.$inferSelect
export type NewTeamSettings = typeof teamSettings.$inferInsert
