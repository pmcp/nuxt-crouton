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
import { defineEventHandler, readBody } from 'h3'
import { eq } from 'drizzle-orm'
import { useNitroApp } from 'nitropack/runtime'
import { user, session, account, member, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin, resolveTargetUser } from '../../../utils/admin'

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

  // Validate target user (checks: exists, not self, not super admin)
  await resolveTargetUser(adminUser.id, body.userId, 'delete')

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

  try {
    await useNitroApp().hooks.callHook('crouton:operation', {
      type: 'admin:user:deleted',
      source: 'crouton-admin',
      userId: adminUser.id,
      metadata: { targetUserId: body.userId }
    })
  } catch { /* non-blocking */ }

  return {
    success: true,
    message: 'User deleted successfully',
    deletedUserId: body.userId
  }
})
