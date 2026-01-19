/**
 * Scoped Access Token Utilities
 *
 * Provides server-side utilities for managing scoped access tokens.
 * These tokens provide lightweight, resource-scoped authentication
 * for scenarios where full user accounts aren't needed.
 *
 * @example
 * ```typescript
 * // Create a helper token for an event
 * const token = await createScopedToken({
 *   organizationId: 'team-123',
 *   resourceType: 'event',
 *   resourceId: 'event-456',
 *   displayName: 'John Helper',
 *   role: 'helper',
 *   expiresIn: 8 * 60 * 60 * 1000 // 8 hours
 * })
 *
 * // Validate a token from request
 * const access = await validateScopedToken(event, 'scoped-access-token')
 * if (access) {
 *   console.log(`Welcome ${access.displayName}`)
 * }
 * ```
 */
import { eq, and, gt, lt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { scopedAccessToken } from '../database/schema/auth'
import type { ScopedAccessToken } from '../database/schema/auth'

/**
 * Options for creating a scoped access token
 */
export interface CreateScopedTokenOptions {
  /** Organization/team ID */
  organizationId: string
  /** Type of resource (e.g., 'event', 'booking') */
  resourceType: string
  /** ID of the specific resource */
  resourceId: string
  /** Display name for the token holder */
  displayName: string
  /** Role for authorization (default: 'guest') */
  role?: string
  /** Time until expiration in milliseconds (default: 8 hours) */
  expiresIn?: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Result of validating a scoped access token
 */
export interface ScopedAccessResult {
  /** Token ID */
  id: string
  /** Organization/team ID */
  organizationId: string
  /** Resource type */
  resourceType: string
  /** Resource ID */
  resourceId: string
  /** Display name */
  displayName: string
  /** Role */
  role: string
  /** Token expiration */
  expiresAt: Date
  /** Additional metadata */
  metadata: Record<string, unknown> | null
}

/**
 * Generate a secure random token string
 */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Create a new scoped access token
 *
 * @param options - Token creation options
 * @returns The created token data including the token string
 */
export async function createScopedToken(
  options: CreateScopedTokenOptions
): Promise<{ token: string; id: string; expiresAt: Date }> {
  const {
    organizationId,
    resourceType,
    resourceId,
    displayName,
    role = 'guest',
    expiresIn = 8 * 60 * 60 * 1000, // 8 hours default
    metadata
  } = options

  const token = generateToken()
  const expiresAt = new Date(Date.now() + expiresIn)
  const id = crypto.randomUUID()

  const db = useDB()

  await db.insert(scopedAccessToken).values({
    id,
    organizationId,
    token,
    resourceType,
    resourceId,
    displayName,
    role,
    isActive: true,
    expiresAt,
    lastActiveAt: new Date(),
    metadata: metadata ? JSON.stringify(metadata) : null
  })

  return { token, id, expiresAt }
}

/**
 * Validate a scoped access token
 *
 * Checks if the token exists, is active, and hasn't expired.
 * Updates lastActiveAt on successful validation.
 *
 * @param token - The token string to validate
 * @returns Token data if valid, null otherwise
 */
export async function validateScopedToken(
  token: string
): Promise<ScopedAccessResult | null> {
  const db = useDB()

  const [record] = await db
    .select()
    .from(scopedAccessToken)
    .where(
      and(
        eq(scopedAccessToken.token, token),
        eq(scopedAccessToken.isActive, true),
        gt(scopedAccessToken.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!record) {
    return null
  }

  // Update last active time
  await db
    .update(scopedAccessToken)
    .set({ lastActiveAt: new Date() })
    .where(eq(scopedAccessToken.id, record.id))

  return {
    id: record.id,
    organizationId: record.organizationId,
    resourceType: record.resourceType,
    resourceId: record.resourceId,
    displayName: record.displayName,
    role: record.role,
    expiresAt: record.expiresAt,
    metadata: record.metadata ? JSON.parse(record.metadata) : null
  }
}

/**
 * Validate scoped access token from H3 event
 *
 * Extracts token from cookie or authorization header and validates it.
 *
 * @param event - H3 event
 * @param cookieName - Name of the cookie to check (default: 'scoped-access-token')
 * @returns Token data if valid, null otherwise
 */
export async function validateScopedTokenFromEvent(
  event: H3Event,
  cookieName = 'scoped-access-token'
): Promise<ScopedAccessResult | null> {
  // Try cookie first
  const cookieToken = getCookie(event, cookieName)
  if (cookieToken) {
    return validateScopedToken(cookieToken)
  }

  // Try authorization header
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return validateScopedToken(token)
  }

  return null
}

/**
 * Require valid scoped access token from H3 event
 *
 * Throws an error if token is invalid or missing.
 *
 * @param event - H3 event
 * @param cookieName - Name of the cookie to check
 * @returns Token data if valid
 * @throws Error if token is invalid or missing
 */
export async function requireScopedAccess(
  event: H3Event,
  cookieName = 'scoped-access-token'
): Promise<ScopedAccessResult> {
  const access = await validateScopedTokenFromEvent(event, cookieName)

  if (!access) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired access token'
    })
  }

  return access
}

/**
 * Require scoped access to a specific resource
 *
 * Validates token and ensures it's scoped to the specified resource.
 *
 * @param event - H3 event
 * @param resourceType - Expected resource type
 * @param resourceId - Expected resource ID
 * @param cookieName - Name of the cookie to check
 * @returns Token data if valid and matches resource
 * @throws Error if token is invalid, expired, or doesn't match resource
 */
export async function requireScopedAccessToResource(
  event: H3Event,
  resourceType: string,
  resourceId: string,
  cookieName = 'scoped-access-token'
): Promise<ScopedAccessResult> {
  const access = await requireScopedAccess(event, cookieName)

  if (access.resourceType !== resourceType || access.resourceId !== resourceId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied to this resource'
    })
  }

  return access
}

/**
 * Revoke a scoped access token
 *
 * Marks the token as inactive. The token will no longer validate.
 *
 * @param token - Token string to revoke
 * @returns True if token was found and revoked
 */
export async function revokeScopedToken(token: string): Promise<boolean> {
  const db = useDB()

  const result = await db
    .update(scopedAccessToken)
    .set({ isActive: false })
    .where(eq(scopedAccessToken.token, token))

  return result.rowsAffected > 0
}

/**
 * Revoke all tokens for a resource
 *
 * Useful when deleting or deactivating a resource.
 *
 * @param resourceType - Resource type
 * @param resourceId - Resource ID
 * @returns Number of tokens revoked
 */
export async function revokeScopedTokensForResource(
  resourceType: string,
  resourceId: string
): Promise<number> {
  const db = useDB()

  const result = await db
    .update(scopedAccessToken)
    .set({ isActive: false })
    .where(
      and(
        eq(scopedAccessToken.resourceType, resourceType),
        eq(scopedAccessToken.resourceId, resourceId),
        eq(scopedAccessToken.isActive, true)
      )
    )

  return result.rowsAffected
}

/**
 * Get existing token for a display name and resource
 *
 * Useful for finding an existing helper session to reuse.
 *
 * @param organizationId - Organization ID
 * @param resourceType - Resource type
 * @param resourceId - Resource ID
 * @param displayName - Display name to search for
 * @returns Existing token record if found
 */
export async function findExistingScopedToken(
  organizationId: string,
  resourceType: string,
  resourceId: string,
  displayName?: string
): Promise<ScopedAccessToken | null> {
  const db = useDB()

  const conditions = [
    eq(scopedAccessToken.organizationId, organizationId),
    eq(scopedAccessToken.resourceType, resourceType),
    eq(scopedAccessToken.resourceId, resourceId),
    eq(scopedAccessToken.isActive, true),
    gt(scopedAccessToken.expiresAt, new Date())
  ]

  if (displayName) {
    conditions.push(eq(scopedAccessToken.displayName, displayName))
  }

  const [record] = await db
    .select()
    .from(scopedAccessToken)
    .where(and(...conditions))
    .limit(1)

  return record || null
}

/**
 * List all active tokens for a resource
 *
 * @param resourceType - Resource type
 * @param resourceId - Resource ID
 * @returns Array of active token records
 */
export async function listScopedTokensForResource(
  resourceType: string,
  resourceId: string
): Promise<Pick<ScopedAccessToken, 'id' | 'displayName' | 'role' | 'expiresAt' | 'lastActiveAt'>[]> {
  const db = useDB()

  const records = await db
    .select({
      id: scopedAccessToken.id,
      displayName: scopedAccessToken.displayName,
      role: scopedAccessToken.role,
      expiresAt: scopedAccessToken.expiresAt,
      lastActiveAt: scopedAccessToken.lastActiveAt
    })
    .from(scopedAccessToken)
    .where(
      and(
        eq(scopedAccessToken.resourceType, resourceType),
        eq(scopedAccessToken.resourceId, resourceId),
        eq(scopedAccessToken.isActive, true),
        gt(scopedAccessToken.expiresAt, new Date())
      )
    )

  return records
}

/**
 * Extend token expiration
 *
 * @param token - Token string
 * @param additionalTime - Additional time in milliseconds
 * @returns New expiration date or null if token not found
 */
export async function extendScopedToken(
  token: string,
  additionalTime: number
): Promise<Date | null> {
  const db = useDB()

  const [record] = await db
    .select()
    .from(scopedAccessToken)
    .where(
      and(
        eq(scopedAccessToken.token, token),
        eq(scopedAccessToken.isActive, true)
      )
    )
    .limit(1)

  if (!record) {
    return null
  }

  const newExpiresAt = new Date(Math.max(record.expiresAt.getTime(), Date.now()) + additionalTime)

  await db
    .update(scopedAccessToken)
    .set({ expiresAt: newExpiresAt })
    .where(eq(scopedAccessToken.id, record.id))

  return newExpiresAt
}

/**
 * Clean up expired tokens
 *
 * Should be called periodically (e.g., in a cron job) to remove old tokens.
 *
 * @returns Number of tokens deleted
 */
export async function cleanupExpiredScopedTokens(): Promise<number> {
  const db = useDB()

  // Delete tokens expired more than 24 hours ago
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const result = await db
    .delete(scopedAccessToken)
    .where(
      and(
        eq(scopedAccessToken.isActive, false)
      )
    )

  // Also delete very old expired active tokens (expiresAt < cutoff)
  const oldResult = await db
    .delete(scopedAccessToken)
    .where(
      and(
        eq(scopedAccessToken.isActive, true),
        lt(scopedAccessToken.expiresAt, cutoff)
      )
    )

  return result.rowsAffected + oldResult.rowsAffected
}
