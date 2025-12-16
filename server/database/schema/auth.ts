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
}, (table) => [
  index('user_email_idx').on(table.email),
  index('user_stripe_customer_idx').on(table.stripeCustomerId),
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
}, (table) => [
  index('session_user_idx').on(table.userId),
  index('session_token_idx').on(table.token),
  index('session_active_org_idx').on(table.activeOrganizationId),
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
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('account_user_idx').on(table.userId),
  index('account_provider_idx').on(table.providerId, table.accountId),
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
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('verification_identifier_idx').on(table.identifier),
])

// ============================================================================
// Organization Plugin Tables
// ============================================================================

/**
 * Organization table - Teams/workspaces
 *
 * Stores organization (team) data. In @crouton/auth:
 * - Multi-tenant: Users create/join multiple organizations
 * - Single-tenant: One default organization for all users
 * - Personal: One organization per user (auto-created)
 */
export const organization = sqliteTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
}, (table) => [
  index('organization_slug_idx').on(table.slug),
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
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
}, (table) => [
  index('member_user_idx').on(table.userId),
  index('member_org_idx').on(table.organizationId),
  index('member_user_org_idx').on(table.userId, table.organizationId),
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
  teamId: text('teamId'), // Optional sub-team reference
}, (table) => [
  index('invitation_email_idx').on(table.email),
  index('invitation_org_idx').on(table.organizationId),
  index('invitation_status_idx').on(table.status),
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
  aaguid: text('aaguid'), // Authenticator GUID
}, (table) => [
  index('passkey_user_idx').on(table.userId),
  index('passkey_credential_idx').on(table.credentialID),
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
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('two_factor_user_idx').on(table.userId),
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
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('subscription_reference_idx').on(table.referenceId),
  index('subscription_stripe_idx').on(table.stripeSubscriptionId),
  index('subscription_status_idx').on(table.status),
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
  invitationsSent: many(invitation),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
  activeOrganization: one(organization, {
    fields: [session.activeOrganizationId],
    references: [organization.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  sessions: many(session),
}))

export const memberRelations = relations(member, ({ one }) => ({
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
}))

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id],
  }),
}))

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
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
