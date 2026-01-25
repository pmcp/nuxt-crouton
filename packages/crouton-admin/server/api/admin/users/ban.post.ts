/**
 * Ban User API Endpoint
 *
 * POST /api/admin/users/ban
 *
 * Bans a user with a reason and optional duration.
 * Also invalidates all active sessions for the user.
 * Requires super admin privileges.
 *
 * Request body:
 * - userId: User ID to ban (required)
 * - reason: Reason for the ban (required)
 * - duration: Ban duration in hours, null for permanent (default: null)
 */
import type { H3Event } from 'h3'
import { defineEventHandler, readBody, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { user, session, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'
import type { BanPayload, AdminUser } from '../../../../types/admin'

export default defineEventHandler(async (event: H3Event): Promise<AdminUser> => {
  // Verify super admin access
  const { user: adminUser } = await requireSuperAdmin(event)

  const db = useAdminDb()

  // Parse and validate body
  const body = await readBody<BanPayload>(event)

  if (!body.userId?.trim()) {
    throw createError({
      status: 400,
      message: 'User ID is required'
    })
  }

  if (!body.reason?.trim()) {
    throw createError({
      status: 400,
      message: 'Ban reason is required'
    })
  }

  // Don't allow banning yourself
  if (body.userId === adminUser.id) {
    throw createError({
      status: 400,
      message: 'You cannot ban yourself'
    })
  }

  // Check if user exists
  const existingUsers = await db
    .select()
    .from(user)
    .where(eq(user.id, body.userId))
    .limit(1)

  if (existingUsers.length === 0) {
    throw createError({
      status: 404,
      message: 'User not found'
    })
  }

  const targetUser = existingUsers[0]

  // Don't allow banning super admins (protect other admins)
  if (targetUser.superAdmin) {
    throw createError({
      status: 403,
      message: 'Cannot ban super admin users'
    })
  }

  // Calculate ban expiration
  const bannedUntil = body.duration
    ? new Date(Date.now() + body.duration * 60 * 60 * 1000)
    : null // null = permanent

  // Update user with ban info
  await db
    .update(user)
    .set({
      banned: true,
      bannedReason: body.reason.trim(),
      bannedUntil: bannedUntil,
      updatedAt: new Date()
    })
    .where(eq(user.id, body.userId))

  // Invalidate all user sessions (delete them)
  await db
    .delete(session)
    .where(eq(session.userId, body.userId))

  // Fetch and return updated user
  const updatedUsers = await db
    .select()
    .from(user)
    .where(eq(user.id, body.userId))
    .limit(1)

  const updatedUser = updatedUsers[0]

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    emailVerified: updatedUser.emailVerified,
    image: updatedUser.image,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
    stripeCustomerId: updatedUser.stripeCustomerId,
    superAdmin: updatedUser.superAdmin,
    banned: updatedUser.banned,
    bannedReason: updatedUser.bannedReason,
    bannedUntil: updatedUser.bannedUntil
  }
})
