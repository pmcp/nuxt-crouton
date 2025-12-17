/**
 * Admin Types for crouton-admin package
 *
 * These types define the data structures used by the admin dashboard
 * for user management, impersonation, and statistics.
 */

// ============================================================================
// Base Types (from crouton-auth schema)
// ============================================================================

/**
 * Base user type - matches crouton-auth user schema
 */
export interface BaseUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: Date
  updatedAt: Date
  stripeCustomerId: string | null
}

/**
 * Base organization type
 */
export interface BaseOrganization {
  id: string
  name: string
  slug: string
  logo: string | null
  metadata: string | null
  personal: boolean
  isDefault: boolean
  ownerId: string | null
  createdAt: Date
}

// ============================================================================
// User Management Types
// ============================================================================

/**
 * Extended user type with admin-specific fields
 */
export interface AdminUser extends BaseUser {
  superAdmin: boolean
  banned: boolean
  bannedReason: string | null
  bannedUntil: Date | null
  // Computed/joined fields
  _membershipCount?: number
  _sessionsCount?: number
}

/**
 * User list item for display in admin tables
 */
export interface AdminUserListItem {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: Date
  superAdmin: boolean
  banned: boolean
  bannedReason: string | null
  bannedUntil: Date | null
  membershipCount: number
}

/**
 * Detailed user view with all related data
 */
export interface AdminUserDetail extends AdminUser {
  memberships: Array<{
    id: string
    role: string
    organization: {
      id: string
      name: string
      slug: string
    }
    createdAt: Date
  }>
  sessions: Array<{
    id: string
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
    expiresAt: Date
    impersonatingFrom: string | null
  }>
  accounts: Array<{
    id: string
    providerId: string
    createdAt: Date
  }>
}

// ============================================================================
// Ban Types
// ============================================================================

/**
 * Payload for banning a user
 */
export interface BanPayload {
  /** User ID to ban */
  userId: string
  /** Reason for the ban (required) */
  reason: string
  /** Ban duration in hours (null = permanent) */
  duration: number | null
}

/**
 * Predefined ban durations
 */
export type BanDuration =
  | 'permanent'
  | '1_hour'
  | '24_hours'
  | '7_days'
  | '30_days'
  | '90_days'

/**
 * Ban duration config
 */
export interface BanDurationOption {
  value: BanDuration
  label: string
  hours: number | null
}

/**
 * Available ban durations for the UI
 */
export const BAN_DURATIONS: BanDurationOption[] = [
  { value: '1_hour', label: '1 hour', hours: 1 },
  { value: '24_hours', label: '24 hours', hours: 24 },
  { value: '7_days', label: '7 days', hours: 168 },
  { value: '30_days', label: '30 days', hours: 720 },
  { value: '90_days', label: '90 days', hours: 2160 },
  { value: 'permanent', label: 'Permanent', hours: null },
]

// ============================================================================
// User Creation Types
// ============================================================================

/**
 * Payload for creating a new user as admin
 */
export interface CreateUserPayload {
  name: string
  email: string
  password: string
  emailVerified?: boolean
  superAdmin?: boolean
}

// ============================================================================
// Team/Organization Types
// ============================================================================

/**
 * Organization list item for admin display
 */
export interface AdminTeamListItem {
  id: string
  name: string
  slug: string
  logo: string | null
  personal: boolean
  isDefault: boolean
  createdAt: Date
  memberCount: number
  ownerName: string | null
  ownerEmail: string | null
}

/**
 * Detailed team view
 */
export interface AdminTeamDetail extends BaseOrganization {
  members: Array<{
    id: string
    userId: string
    role: string
    createdAt: Date
    user: {
      id: string
      name: string
      email: string
      image: string | null
    }
  }>
}

// ============================================================================
// Impersonation Types
// ============================================================================

/**
 * Payload for starting impersonation
 */
export interface StartImpersonationPayload {
  userId: string
}

/**
 * Impersonation state
 */
export interface ImpersonationState {
  isImpersonating: boolean
  originalAdminId: string | null
  impersonatedUser: {
    id: string
    name: string
    email: string
  } | null
}

// ============================================================================
// Stats & Analytics Types
// ============================================================================

/**
 * Dashboard statistics
 */
export interface AdminStats {
  /** Total number of users */
  totalUsers: number
  /** Users created in the last 24 hours */
  newUsersToday: number
  /** Users created in the last 7 days */
  newUsersWeek: number
  /** Number of currently banned users */
  bannedUsers: number
  /** Total number of teams/organizations */
  totalTeams: number
  /** Teams created in the last 7 days */
  newTeamsWeek: number
  /** Number of active sessions */
  activeSessions: number
  /** Number of super admin users */
  superAdminCount: number
}

/**
 * Activity log entry
 */
export interface AdminActivityEntry {
  id: string
  type: 'user_created' | 'user_banned' | 'user_unbanned' | 'user_deleted' | 'team_created' | 'impersonation_started' | 'impersonation_ended'
  timestamp: Date
  actorId: string
  actorName: string
  targetId?: string
  targetName?: string
  details?: Record<string, unknown>
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * User list filter options
 */
export interface UserListFilters {
  search?: string
  status?: 'all' | 'active' | 'banned'
  superAdmin?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'email' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Team list filter options
 */
export interface TeamListFilters {
  search?: string
  personal?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'createdAt' | 'memberCount'
  sortOrder?: 'asc' | 'desc'
}
