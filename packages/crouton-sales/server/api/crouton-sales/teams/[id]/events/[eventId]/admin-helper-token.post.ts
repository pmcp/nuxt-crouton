/**
 * Admin POS token — issues a helper scoped-access token for a logged-in
 * team member, without requiring the event PIN. Lets admins open the POS
 * directly (the order endpoints stay helper-token-authenticated, so order
 * attribution via displayName keeps working).
 */
import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createScopedToken } from '@fyit/crouton-auth/server/utils/scoped-access'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
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

  const helperName = user.name || user.email || 'Admin'

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
