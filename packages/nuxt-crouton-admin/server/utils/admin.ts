/**
 * Server Admin Utilities
 *
 * Server-side authorization helpers for admin API routes.
 * Requires @crouton/auth to be configured.
 *
 * @example
 * ```typescript
 * // In an admin API route
 * export default defineEventHandler(async (event) => {
 *   const admin = await requireSuperAdmin(event)
 *   // admin is guaranteed to be a super admin user
 * })
 * ```
 */
import type { H3Event } from 'h3'
import { createError } from 'h3'
import type { AdminUser } from '../../types/admin'
// useServerAuth is auto-imported from nuxt-crouton-auth layer

/**
 * Extended user type from Better Auth session that includes admin fields
 */
interface SessionUser {
  id: string
  email: string
  name: string | null
  image: string | null
  emailVerified: boolean
  createdAt: string | Date
  updatedAt: string | Date
  superAdmin?: boolean
  banned?: boolean
  bannedReason?: string | null
  bannedUntil?: string | Date | null
}

/**
 * Admin context returned by requireSuperAdmin
 */
export interface AdminContext {
  user: AdminUser
}

/**
 * Require super admin privileges
 *
 * Throws 401 if not authenticated, 403 if not a super admin.
 *
 * @param event - H3 event
 * @returns Admin context with user info
 * @throws 401 Unauthorized if not authenticated
 * @throws 403 Forbidden if not a super admin
 */
export async function requireSuperAdmin(event: H3Event): Promise<AdminContext> {
  // Get the auth instance from crouton-auth
  // This function is auto-imported from @crouton/auth/server/utils
  const auth = useServerAuth(event)
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  const user = session.user as SessionUser

  // Check if user is banned
  if (user.banned) {
    const bannedUntil = user.bannedUntil ? new Date(user.bannedUntil) : null
    const isPermanent = !bannedUntil
    const isStillBanned = isPermanent || bannedUntil > new Date()

    if (isStillBanned) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: user.bannedReason || 'Your account has been banned',
      })
    }
  }

  // Check super admin status
  if (!user.superAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Super admin access required',
    })
  }

  // Map to AdminUser type
  const adminUser: AdminUser = {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    image: user.image,
    emailVerified: user.emailVerified,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
    superAdmin: true,
    banned: user.banned ?? false,
    bannedReason: user.bannedReason ?? null,
    bannedUntil: user.bannedUntil ? new Date(user.bannedUntil) : null,
    stripeCustomerId: null,
  }

  return { user: adminUser }
}

/**
 * Get super admin user (optional)
 *
 * Returns admin user if authenticated and is super admin, null otherwise.
 * Does not throw on missing auth or non-admin users.
 *
 * @param event - H3 event
 * @returns Admin user or null
 */
export async function getSuperAdmin(event: H3Event): Promise<AdminUser | null> {
  try {
    const { user } = await requireSuperAdmin(event)
    return user
  }
  catch {
    return null
  }
}

/**
 * Check if current user is a super admin
 *
 * @param event - H3 event
 * @returns True if user is authenticated and is a super admin
 */
export async function isSuperAdmin(event: H3Event): Promise<boolean> {
  const admin = await getSuperAdmin(event)
  return admin !== null
}
