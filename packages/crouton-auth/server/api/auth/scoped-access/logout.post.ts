/**
 * Logout Scoped Access Token
 *
 * POST /api/auth/scoped-access/logout
 *
 * Revokes a scoped access token.
 */
import { revokeScopedToken } from '../../../utils/scoped-access'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token } = body

  if (!token) {
    throw createError({
      status: 400,
      statusText: 'Token is required'
    })
  }

  const revoked = await revokeScopedToken(token)

  return { success: revoked }
})
