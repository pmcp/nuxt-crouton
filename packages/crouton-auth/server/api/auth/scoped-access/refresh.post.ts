/**
 * Refresh Scoped Access Token
 *
 * POST /api/auth/scoped-access/refresh
 *
 * Slides the expiry of the CALLER'S OWN scoped token forward, bounded by the
 * token's grant TTL policy. The token is taken from the authenticated request
 * (the canonical x-scoped-token header / cookie), never from the body, so only
 * the legitimate holder of a currently-valid token can refresh it — and an
 * expired token cannot be revived (the holder must re-redeem the grant).
 */
import { requireScopedAccess, extendScopedToken } from '../../../utils/scoped-access'

export default defineEventHandler(async (event) => {
  // Authenticates the holder (header → cookie → Bearer) and rejects an
  // invalid/expired token with 401.
  const access = await requireScopedAccess(event)

  const newExpiresAt = await extendScopedToken(access.token)

  if (!newExpiresAt) {
    throw createError({
      status: 404,
      statusText: 'Token not found or already expired'
    })
  }

  return {
    success: true,
    expiresAt: newExpiresAt.toISOString()
  }
})
