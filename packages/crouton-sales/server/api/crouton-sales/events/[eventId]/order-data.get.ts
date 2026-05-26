import { eq } from 'drizzle-orm'
import { requireScopedAccessToResource } from '@fyit/crouton-auth/server/utils/scoped-access'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'
import { salesProducts } from '~~/layers/sales/collections/products/server/database/schema'
import { salesCategories } from '~~/layers/sales/collections/categories/server/database/schema'
import { salesClients } from '~~/layers/sales/collections/clients/server/database/schema'
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

  const categories = await db
    .select()
    .from(salesCategories)
    .where(eq(salesCategories.teamId, salesEvent.teamId))

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

  return {
    event: {
      id: salesEvent.id,
      title: salesEvent.title,
      slug: salesEvent.slug,
      teamId: salesEvent.teamId,
      requiresClient: salesEvent.requiresClient
    },
    products,
    categories,
    clients,
    settings: { useReusableClients },
    helper: {
      id: access.id,
      name: access.displayName
    }
  }
})
