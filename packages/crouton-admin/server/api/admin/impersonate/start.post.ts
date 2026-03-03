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
import { useNitroApp } from 'nitropack/runtime'
import { session, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin, resolveTargetUser, isUserBanned } from '../../../utils/admin'
import type { StartImpersonationPayload, ImpersonationState } from '../../../../types/admin'
// useServerAuth is auto-imported from nuxt-crouton-auth layer

export default defineEventHandler(async (event: H3Event): Promise<ImpersonationState> => {
  // Verify super admin access
  const { user: adminUser } = await requireSuperAdmin(event)

  const db = useAdminDb()

  // Parse and validate body
  const body = await readBody<StartImpersonationPayload>(event)

  // Validate target user (checks: exists, not self, not super admin)
  const targetUser = await resolveTargetUser(adminUser.id, body.userId, 'impersonate')

  // Don't allow impersonating banned users
  if (isUserBanned(targetUser)) {
    throw createError({
      status: 400,
      message: 'Cannot impersonate banned users'
    })
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

  try {
    await useNitroApp().hooks.callHook('crouton:operation', {
      type: 'admin:impersonate:start',
      source: 'crouton-admin',
      userId: adminUser.id,
      metadata: { targetUserId: targetUser.id }
    })
  } catch { /* non-blocking */ }

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
