/// <reference path="../../../crouton-hooks.d.ts" />
/**
 * Redeem a Scoped Access Grant
 *
 * POST /api/auth/scoped-access/redeem
 *
 * Public endpoint: presents a credential (PIN) for a resource and receives a
 * scoped access token. The credential is the auth — no session required.
 * Brute-force protection is per-grant lockout inside verifyAndRedeemGrant;
 * 'not_found' and 'invalid_secret' are deliberately indistinguishable to
 * clients so the endpoint doesn't confirm which resources have grants.
 *
 * The token is also mirrored into the 'scoped-access-token' cookie so SSR
 * requests (e.g. scoped-visibility pages) can validate without the header.
 */
import { verifyAndRedeemGrant } from '../../../utils/scoped-access'
import { getTeamById, getTeamBySlug } from '../../../utils/team'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    teamId?: string
    resourceType?: string
    resourceId?: string
    secret?: string
    displayName?: string
    credentialType?: string
  }>(event)

  const { teamId, resourceType, resourceId, secret, displayName, credentialType } = body || {}

  if (!teamId || !resourceType || !resourceId || !secret || !displayName) {
    throw createError({
      status: 400,
      statusText: 'teamId, resourceType, resourceId, secret and displayName are required'
    })
  }

  const team = await getTeamById(event, teamId) ?? await getTeamBySlug(event, teamId)
  if (!team) {
    throw createError({ status: 404, statusText: 'Team not found' })
  }

  // Let domain packages lazily sync their source credential into the grant
  // before verification (e.g. crouton-sales syncs salesEvents.helperPin into
  // the event grant). Hook failures must not leak credential info on this
  // public endpoint: log and continue — the redeem then fails as a normal
  // not_found/invalid_secret 401.
  try {
    await useNitroApp().hooks.callHook('crouton:scoped-access:before-redeem', {
      organizationId: team.id,
      resourceType,
      resourceId,
      credentialType: credentialType || 'pin'
    })
  }
  catch (err) {
    console.error('[crouton-auth] before-redeem hook failed:', err)
  }

  const result = await verifyAndRedeemGrant({
    organizationId: team.id,
    resourceType,
    resourceId,
    secret,
    displayName,
    credentialType
  })

  if (!result.ok) {
    if (result.reason === 'locked') {
      const retryAfterSeconds = Math.ceil((result.retryAfterMs ?? 60000) / 1000)
      setHeader(event, 'Retry-After', retryAfterSeconds)
      throw createError({
        status: 429,
        statusText: 'Too many attempts — try again later'
      })
    }
    if (result.reason === 'exhausted') {
      throw createError({ status: 410, statusText: 'This access code is no longer available' })
    }
    throw createError({ status: 401, statusText: 'Invalid credentials' })
  }

  setCookie(event, 'scoped-access-token', result.token, {
    path: '/',
    expires: result.expiresAt,
    sameSite: 'lax',
    httpOnly: true,
    secure: !import.meta.dev
  })

  return {
    token: result.token,
    displayName: result.displayName,
    role: result.role,
    resourceType: result.resourceType,
    resourceId: result.resourceId,
    teamId: team.id,
    expiresAt: result.expiresAt.toISOString()
  }
})
