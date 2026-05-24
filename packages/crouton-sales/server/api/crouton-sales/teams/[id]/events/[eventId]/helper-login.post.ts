/**
 * Helper PIN login — public endpoint (no team session required).
 *
 * The PIN itself is the auth credential. We scope the lookup by both
 * teamId (route param, accepts UUID or slug) and eventId so a PIN can
 * only unlock its own event. On success we issue a scopedAccessToken
 * tied to the event; the client persists it via useHelperAuth/useEventAccess.
 */
import { eq, and } from 'drizzle-orm'
import { resolveTeamBySlugOrId } from '@fyit/crouton-auth/server/utils/team'
import { createScopedToken } from '@fyit/crouton-auth/server/utils/scoped-access'
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

  if (String(salesEvent.helperPin).trim() !== String(pin).trim()) {
    throw createError({ status: 401, statusText: 'Invalid PIN' })
  }

  const { token, expiresAt } = await createScopedToken({
    organizationId: team.id,
    resourceType: 'event',
    resourceId: eventId,
    displayName: helperName,
    role: 'helper'
  })

  return {
    token,
    helperName,
    teamId: team.id,
    eventId,
    role: 'helper',
    expiresAt: expiresAt.toISOString()
  }
})
