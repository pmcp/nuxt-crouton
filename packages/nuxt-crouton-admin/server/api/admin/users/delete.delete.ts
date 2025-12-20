/**
 * Delete User API Endpoint
 *
 * DELETE /api/admin/users/delete
 *
 * Permanently deletes a user and all related data.
 * Cascades to sessions, accounts, and memberships.
 * Requires super admin privileges.
 *
 * Request body:
 * - userId: User ID to delete (required)
 */
import type { H3Event } from 'h3'
import { defineEventHandler, readBody, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { user, session, account, member, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'

interface DeletePayload {
  userId: string
}

interface DeleteResponse {
  success: boolean
  message: string
  deletedUserId: string
}

export default defineEventHandler(async (event: H3Event): Promise<DeleteResponse> => {
  // Verify super admin access
  const { user: adminUser } = await requireSuperAdmin(event)

  const db = useAdminDb()

  // Parse and validate body
  const body = await readBody<DeletePayload>(event)

  if (!body.userId?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  // Don't allow deleting yourself
  if (body.userId === adminUser.id) {
    throw createError({
      statusCode: 400,
      message: 'You cannot delete yourself'
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
      message: 'User not found'
    })
  }

  const targetUser = existingUsers[0]

  // Don't allow deleting super admins (protect other admins)
  if (targetUser.superAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Cannot delete super admin users'
    })
  }

  // Delete in order to respect foreign key constraints
  // (The schema uses onDelete: 'cascade' but we do it explicitly for clarity)

  // 1. Delete sessions
  await db
    .delete(session)
    .where(eq(session.userId, body.userId))

  // 2. Delete accounts (OAuth, credentials)
  await db
    .delete(account)
    .where(eq(account.userId, body.userId))

  // 3. Delete team memberships
  await db
    .delete(member)
    .where(eq(member.userId, body.userId))

  // 4. Delete the user
  await db
    .delete(user)
    .where(eq(user.id, body.userId))

  return {
    success: true,
    message: 'User deleted successfully',
    deletedUserId: body.userId
  }
})
