// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesEvent } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { SalesEvent } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { eventId } = getRouterParams(event)
  if (!eventId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing event ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesEvent>>(event)

  return await updateSalesEvent(eventId, team.id, user.id, {
    id: body.id,
    title: body.title,
    slug: body.slug,
    description: body.description,
    eventType: body.eventType,
    startDate: body.startDate ? new Date(body.startDate) : body.startDate,
    endDate: body.endDate ? new Date(body.endDate) : body.endDate,
    status: body.status,
    isCurrent: body.isCurrent,
    helperPin: body.helperPin,
    metadata: body.metadata,
    archivedAt: body.archivedAt ? new Date(body.archivedAt) : body.archivedAt
  })
})