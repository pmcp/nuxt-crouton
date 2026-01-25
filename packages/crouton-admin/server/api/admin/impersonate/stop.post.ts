/**
 * Stop Impersonation API Endpoint
 *
 * POST /api/admin/impersonate/stop
 *
 * Stops impersonating a user and restores the admin session.
 * The session's userId is restored to the original admin ID.
 *
 * Security:
 * - Only works if currently impersonating (impersonatingFrom is set)
 * - Restores session to original admin user
 */
import type { H3Event } from 'h3'
import { createError, defineEventHandler } from 'h3'
import { eq } from 'drizzle-orm'
import { user, session, useAdminDb } from '../../../utils/db'
import type { ImpersonationState } from '../../../../types/admin'
// useServerAuth is auto-imported from nuxt-crouton-auth layer

export default defineEventHandler(async (event: H3Event): Promise<ImpersonationState> => {
  const db = useAdminDb()

  // Get the current session
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

  // Get session details from database
  const sessions = await db
    .select()
    .from(session)
    .where(eq(session.id, currentSession.session.id))
    .limit(1)

  if (sessions.length === 0) {
    throw createError({
      status: 404,
      message: 'Session not found'
    })
  }

  const currentDbSession = sessions[0]

  // Check if currently impersonating
  if (!currentDbSession.impersonatingFrom) {
    throw createError({
      status: 400,
      message: 'Not currently impersonating any user'
    })
  }

  const originalAdminId = currentDbSession.impersonatingFrom

  // Verify the original admin still exists and is still a super admin
  const adminUsers = await db
    .select()
    .from(user)
    .where(eq(user.id, originalAdminId))
    .limit(1)

  if (adminUsers.length === 0) {
    // Original admin no longer exists - invalidate this session
    await db
      .delete(session)
      .where(eq(session.id, currentSession.session.id))

    throw createError({
      status: 401,
      message: 'Original admin account no longer exists. Session invalidated.'
    })
  }

  // Restore the session to the original admin
  await db
    .update(session)
    .set({
      userId: originalAdminId,
      impersonatingFrom: null,
      updatedAt: new Date()
    })
    .where(eq(session.id, currentSession.session.id))

  return {
    isImpersonating: false,
    originalAdminId: null,
    impersonatedUser: null
  }
})
