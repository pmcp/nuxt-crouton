import { eq } from 'drizzle-orm'
import { requireScopedAccessToResource } from '@fyit/crouton-auth/server/utils/scoped-access'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'
import { salesProducts } from '~~/layers/sales/collections/products/server/database/schema'
import { salesCategories } from '~~/layers/sales/collections/categories/server/database/schema'
import { salesClients } from '~~/layers/sales/collections/clients/server/database/schema'
import { salesLocations } from '~~/layers/sales/collections/locations/server/database/schema'
import { salesEventsettings } from '~~/layers/sales/collections/eventsettings/server/database/schema'

// Helper-authenticated endpoint: all data needed for POS order interface
export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const access = await requireScopedAccessToResource(event, 'event', eventId, 'pos-helper-token')

  const db = useDB()

  const [salesEvent] = await db
    .select()
    .from(salesEvents)
    .where(eq(salesEvents.id, eventId))
    .limit(1)

  if (!salesEvent) {
    throw createError({ status: 404, statusText: 'Event not found' })
  }

  const products = await db
    .select()
    .from(salesProducts)
    .where(eq(salesProducts.eventId, eventId))

  // Scope to the event, not the team — duplicated events clone their
  // categories, so team-wide fetching showed every clone as a duplicate tab.
  const categories = await db
    .select()
    .from(salesCategories)
    .where(eq(salesCategories.eventId, eventId))

  const settings = await db
    .select()
    .from(salesEventsettings)
    .where(eq(salesEventsettings.eventId, eventId))

  const settingsObj: Record<string, string> = {}
  for (const setting of settings) {
    settingsObj[setting.settingKey] = setting.settingValue || ''
  }

  const useReusableClients = settingsObj.use_reusable_clients === 'true'

  const clients = await db
    .select({ id: salesClients.id, title: salesClients.title })
    .from(salesClients)
    .where(eq(salesClients.teamId, salesEvent.teamId))

  // Locations for this event — used to label per-location remark inputs in the POS.
  const locations = await db
    .select({ id: salesLocations.id, title: salesLocations.title })
    .from(salesLocations)
    .where(eq(salesLocations.eventId, eventId))

  return {
    event: {
      id: salesEvent.id,
      title: salesEvent.title,
      slug: salesEvent.slug,
      teamId: salesEvent.teamId,
      requiresClient: salesEvent.requiresClient,
      currency: salesEvent.currency || 'EUR'
    },
    products,
    categories,
    clients,
    locations,
    settings: { useReusableClients },
    helper: {
      id: access.id,
      name: access.displayName
    }
  }
})
