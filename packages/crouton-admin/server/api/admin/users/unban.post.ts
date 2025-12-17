/**
 * Unban User API Endpoint
 *
 * POST /api/admin/users/unban
 *
 * Removes a ban from a user.
 * Requires super admin privileges.
 *
 * Request body:
 * - userId: User ID to unban (required)
 */
import type { H3Event } from 'h3'
import { defineEventHandler, readBody, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { user, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'
import type { AdminUser } from '../../../../types/admin'

interface UnbanPayload {
  userId: string
}

export default defineEventHandler(async (event: H3Event): Promise<AdminUser> => {
  // Verify super admin access
  await requireSuperAdmin(event)

  const db = useAdminDb()

  // Parse and validate body
  const body = await readBody<UnbanPayload>(event)

  if (!body.userId?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required',
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
      statusCode: 404,
      message: 'User not found',
    })
  }

  const targetUser = existingUsers[0]

  // Check if user is actually banned
  if (!targetUser.banned) {
    throw createError({
      statusCode: 400,
      message: 'User is not banned',
    })
  }

  // Clear ban
  await db
    .update(user)
    .set({
      banned: false,
      bannedReason: null,
      bannedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, body.userId))

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
    bannedUntil: updatedUser.bannedUntil,
  }
})
