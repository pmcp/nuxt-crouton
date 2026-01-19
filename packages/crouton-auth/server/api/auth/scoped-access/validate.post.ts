/**
 * Validate Scoped Access Token
 *
 * POST /api/auth/scoped-access/validate
 *
 * Validates a scoped access token and returns its details.
 */
import { validateScopedToken } from '../../../utils/scoped-access'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token } = body

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token is required'
    })
  }

  const access = await validateScopedToken(token)

  if (!access) {
    return { valid: false }
  }

  return {
    valid: true,
    displayName: access.displayName,
    organizationId: access.organizationId,
    resourceType: access.resourceType,
    resourceId: access.resourceId,
    role: access.role,
    expiresAt: access.expiresAt.toISOString()
  }
})
