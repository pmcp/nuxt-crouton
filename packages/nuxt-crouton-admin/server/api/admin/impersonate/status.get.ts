/**
 * Impersonation Status API Endpoint
 *
 * GET /api/admin/impersonate/status
 *
 * Returns the current impersonation state for the session.
 * Used to restore impersonation UI state after page refresh.
 */
import type { H3Event } from 'h3'
import { defineEventHandler } from 'h3'
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
    return {
      isImpersonating: false,
      originalAdminId: null,
      impersonatedUser: null
    }
  }

  // Get session details from database to check impersonatingFrom
  const sessions = await db
    .select()
    .from(session)
    .where(eq(session.id, currentSession.session.id))
    .limit(1)

  if (sessions.length === 0 || !sessions[0].impersonatingFrom) {
    return {
      isImpersonating: false,
      originalAdminId: null,
      impersonatedUser: null
    }
  }

  const currentDbSession = sessions[0]
  const originalAdminId = currentDbSession.impersonatingFrom

  // Get the impersonated user's details
  const impersonatedUsers = await db
    .select()
    .from(user)
    .where(eq(user.id, currentDbSession.userId))
    .limit(1)

  if (impersonatedUsers.length === 0) {
    // Impersonated user no longer exists, clear impersonation
    return {
      isImpersonating: false,
      originalAdminId: null,
      impersonatedUser: null
    }
  }

  const impersonatedUser = impersonatedUsers[0]!

  return {
    isImpersonating: true,
    originalAdminId,
    impersonatedUser: {
      id: impersonatedUser.id,
      name: impersonatedUser.name,
      email: impersonatedUser.email
    }
  }
})
