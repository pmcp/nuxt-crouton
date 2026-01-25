/**
 * Start Impersonation API Endpoint
 *
 * POST /api/admin/impersonate/start
 *
 * Starts impersonating a user. The admin's session is modified to
 * act as the target user while preserving the original admin ID.
 *
 * Security:
 * - Requires super admin privileges
 * - Cannot impersonate other super admins
 * - Cannot impersonate yourself
 * - Stores original admin ID for audit trail
 *
 * Request body:
 * - userId: User ID to impersonate (required)
 */
import type { H3Event } from 'h3'
import { createError, readBody, defineEventHandler } from 'h3'
import { eq } from 'drizzle-orm'
import { user, session, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'
import type { StartImpersonationPayload, ImpersonationState } from '../../../../types/admin'
// useServerAuth is auto-imported from nuxt-crouton-auth layer

export default defineEventHandler(async (event: H3Event): Promise<ImpersonationState> => {
  // Verify super admin access
  const { user: adminUser } = await requireSuperAdmin(event)

  const db = useAdminDb()

  // Parse and validate body
  const body = await readBody<StartImpersonationPayload>(event)

  if (!body.userId?.trim()) {
    throw createError({
      status: 400,
      message: 'User ID is required'
    })
  }

  // Don't allow impersonating yourself
  if (body.userId === adminUser.id) {
    throw createError({
      status: 400,
      message: 'You cannot impersonate yourself'
    })
  }

  // Check if user exists
  const targetUsers = await db
    .select()
    .from(user)
    .where(eq(user.id, body.userId))
    .limit(1)

  if (targetUsers.length === 0) {
    throw createError({
      status: 404,
      message: 'User not found'
    })
  }

  const targetUser = targetUsers[0]

  // Don't allow impersonating super admins (protect other admins)
  if (targetUser.superAdmin) {
    throw createError({
      status: 403,
      message: 'Cannot impersonate super admin users'
    })
  }

  // Don't allow impersonating banned users
  if (targetUser.banned) {
    const bannedUntil = targetUser.bannedUntil ? new Date(targetUser.bannedUntil) : null
    const isPermanent = !bannedUntil
    const isStillBanned = isPermanent || bannedUntil > new Date()

    if (isStillBanned) {
      throw createError({
        status: 400,
        message: 'Cannot impersonate banned users'
      })
    }
  }

  // Get the current session to modify
  const auth = useServerAuth(event)
  const currentSession = await auth.api.getSession({
    headers: event.headers
  })

  if (!currentSession?.session?.id) {
    throw createError({
      status: 401,
      message: 'No active session found'
    })
  }

  // Check if already impersonating
  const existingSessions = await db
    .select()
    .from(session)
    .where(eq(session.id, currentSession.session.id))
    .limit(1)

  if (existingSessions.length > 0 && existingSessions[0].impersonatingFrom) {
    throw createError({
      status: 400,
      message: 'Already impersonating a user. Stop current impersonation first.'
    })
  }

  // Update the session to impersonate the target user
  // Store original admin ID in impersonatingFrom
  // Change userId to target user
  await db
    .update(session)
    .set({
      userId: targetUser.id,
      impersonatingFrom: adminUser.id,
      updatedAt: new Date()
    })
    .where(eq(session.id, currentSession.session.id))

  return {
    isImpersonating: true,
    originalAdminId: adminUser.id,
    impersonatedUser: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email
    }
  }
})
