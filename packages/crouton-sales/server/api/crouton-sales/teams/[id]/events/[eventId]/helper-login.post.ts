/**
 * Helper PIN login — public endpoint (no team session required).
 *
 * Thin wrapper over crouton-auth's scoped access grants: the event row's
 * helperPin is lazily synced into the event's grant (preserving lockout
 * counters when unchanged — no backfill needed, grants materialize on
 * first login), then the presented PIN is redeemed for a scoped token.
 * Brute-force lockout lives in verifyAndRedeemGrant, not here.
 *
 * Response shape is unchanged for useHelperAuth back-compat.
 */
import { eq, and } from 'drizzle-orm'
import { resolveTeamBySlugOrId } from '@fyit/crouton-auth/server/utils/team'
import { upsertScopedGrant, verifyAndRedeemGrant } from '@fyit/crouton-auth/server/utils/scoped-access'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamBySlugOrId(event, 'id')
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const body = await readBody<{ pin?: string, helperName?: string }>(event)
  const { pin, helperName } = body

  if (!pin) {
    throw createError({ status: 400, statusText: 'PIN is required' })
  }

  if (!helperName) {
    throw createError({ status: 400, statusText: 'Helper name is required' })
  }

  const db = useDB()

  const [salesEvent] = await db
    .select()
    .from(salesEvents)
    .where(and(eq(salesEvents.id, eventId), eq(salesEvents.teamId, team.id)))
    .limit(1)

  if (!salesEvent) {
    throw createError({ status: 404, statusText: 'Event not found' })
  }

  if (!salesEvent.helperPin) {
    throw createError({ status: 400, statusText: 'Helper PIN not configured for this event' })
  }

  await upsertScopedGrant({
    organizationId: team.id,
    resourceType: 'event',
    resourceId: eventId,
    secret: String(salesEvent.helperPin).trim(),
    role: 'helper'
  })

  const result = await verifyAndRedeemGrant({
    organizationId: team.id,
    resourceType: 'event',
    resourceId: eventId,
    secret: String(pin).trim(),
    displayName: helperName
  })

  if (!result.ok) {
    if (result.reason === 'locked') {
      setHeader(event, 'Retry-After', Math.ceil((result.retryAfterMs ?? 60000) / 1000))
      throw createError({ status: 429, statusText: 'Too many attempts — try again later' })
    }
    throw createError({ status: 401, statusText: 'Invalid PIN' })
  }

  return {
    token: result.token,
    helperName,
    teamId: team.id,
    eventId,
    role: result.role,
    expiresAt: result.expiresAt.toISOString()
  }
})
