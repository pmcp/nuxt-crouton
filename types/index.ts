/**
 * @crouton/auth Type Exports
 *
 * Re-exports all types from the package.
 */

// Configuration types
export type {
  // OAuth
  OAuthProviderConfig,
  GitHubOAuthConfig,
  GoogleOAuthConfig,
  DiscordOAuthConfig,
  OAuthConfig,
  // Auth methods
  PasswordConfig,
  PasskeyConfig,
  TwoFactorConfig,
  MagicLinkConfig,
  PhoneConfig,
  AuthMethodsConfig,
  // Teams
  TeamsConfig,
  TeamRole,
  // Billing
  StripeConfig,
  StripePlan,
  BillingConfig,
  // UI
  RedirectConfig,
  UIConfig,
  // Session
  SessionConfig,
  // Main config
  AuthMode,
  CroutonAuthConfig,
  // Runtime config
  AuthServerRuntimeConfig,
  AuthPublicRuntimeConfig,
  // Helpers
  ResolveConfig,
} from './config'

// Config helper functions
export {
  isMethodEnabled,
  getMethodConfig,
} from './config'

// Auth types
export type {
  // User
  User,
  UserProfile,
  // Session
  Session,
  SessionWithUser,
  // Team
  Team,
  TeamWithStats,
  // Member
  MemberRole,
  Member,
  MemberWithUser,
  Invitation,
  InvitationWithInviter,
  // Subscription
  SubscriptionStatus,
  Subscription,
  SubscriptionWithPlan,
  // OAuth
  LinkedAccount,
  // Passkey
  Passkey,
  // Events
  AuthEventType,
  AuthEvent,
} from './auth'
