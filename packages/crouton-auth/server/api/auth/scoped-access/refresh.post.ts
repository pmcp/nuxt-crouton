/**
 * Refresh Scoped Access Token
 *
 * POST /api/auth/scoped-access/refresh
 *
 * Extends the expiration of a scoped access token.
 */
import { extendScopedToken } from '../../../utils/scoped-access'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, additionalTime } = body

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token is required'
    })
  }

  // Default to 8 hours if not specified
  const timeToAdd = additionalTime || 8 * 60 * 60 * 1000

  const newExpiresAt = await extendScopedToken(token, timeToAdd)

  if (!newExpiresAt) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Token not found or already expired'
    })
  }

  return {
    success: true,
    expiresAt: newExpiresAt.toISOString()
  }
})
