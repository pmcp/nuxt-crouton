/**
 * Better Auth API Handler
 *
 * Catch-all route handler that delegates to Better Auth.
 * All auth endpoints are handled through /api/auth/*
 *
 * Endpoints handled:
 * - POST /api/auth/sign-in/email - Email/password sign in
 * - POST /api/auth/sign-up/email - Email/password sign up
 * - POST /api/auth/sign-out - Sign out
 * - GET /api/auth/session - Get current session
 * - POST /api/auth/forgot-password - Request password reset
 * - POST /api/auth/reset-password - Reset password with token
 * - And more (OAuth, passkeys, 2FA, etc. when enabled)
 */
import { useServerAuth } from '../../utils/useServerAuth'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  console.log(`[@crouton/auth] API request: ${event.method} ${url.pathname}`)

  try {
    // Get the auth instance (lazily initialized)
    const auth = useServerAuth(event)

    // Convert H3 event to Web Request and handle with Better Auth
    const response = await auth.handler(toWebRequest(event))

    console.log(`[@crouton/auth] API response: ${response.status} for ${url.pathname}`)
    return response
  } catch (error) {
    console.error(`[@crouton/auth] API error for ${url.pathname}:`, error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Auth handler error'
    })
  }
})
