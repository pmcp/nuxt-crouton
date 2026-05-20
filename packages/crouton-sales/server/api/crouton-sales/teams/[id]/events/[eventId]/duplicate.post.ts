import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'
import { salesCategories } from '~~/layers/sales/collections/categories/server/database/schema'
import { salesLocations } from '~~/layers/sales/collections/locations/server/database/schema'
import { salesProducts } from '~~/layers/sales/collections/products/server/database/schema'
import { salesPrinters } from '~~/layers/sales/collections/printers/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const db = useDB()

  const [originalEvent] = await db
    .select()
    .from(salesEvents)
    .where(and(eq(salesEvents.id, eventId), eq(salesEvents.teamId, team.id)))
    .limit(1)

  if (!originalEvent) {
    throw createError({ status: 404, statusText: 'Event not found' })
  }

  const newEventId = nanoid()
  const timestamp = Date.now()
  const [newEvent] = await db
    .insert(salesEvents)
    .values({
      id: newEventId,
      teamId: team.id,
      owner: user.id,
      title: `${originalEvent.title} (Copy)`,
      slug: `${originalEvent.slug}-copy-${timestamp}`,
      description: originalEvent.description,
      eventType: originalEvent.eventType,
      startDate: null,
      endDate: null,
      status: originalEvent.status,
      isCurrent: false,
      helperPin: originalEvent.helperPin,
      metadata: originalEvent.metadata,
      archivedAt: null,
      createdBy: user.id,
      updatedBy: user.id
    })
    .returning()

  // Categories
  const categories = await db
    .select()
    .from(salesCategories)
    .where(eq(salesCategories.eventId, eventId))

  const categoryMap: Record<string, string> = {}
  for (const cat of categories) {
    const newCatId = nanoid()
    categoryMap[cat.id] = newCatId
    await db.insert(salesCategories).values({
      id: newCatId,
      teamId: team.id,
      owner: user.id,
      eventId: newEventId,
      title: cat.title,
      displayOrder: cat.displayOrder,
      createdBy: user.id,
      updatedBy: user.id
    })
  }

  // Locations
  const locations = await db
    .select()
    .from(salesLocations)
    .where(eq(salesLocations.eventId, eventId))

  const locationMap: Record<string, string> = {}
  for (const loc of locations) {
    const newLocId = nanoid()
    locationMap[loc.id] = newLocId
    await db.insert(salesLocations).values({
      id: newLocId,
      teamId: team.id,
      owner: user.id,
      eventId: newEventId,
      title: loc.title,
      createdBy: user.id,
      updatedBy: user.id
    })
  }

  // Products
  const products = await db
    .select()
    .from(salesProducts)
    .where(eq(salesProducts.eventId, eventId))

  for (const prod of products) {
    await db.insert(salesProducts).values({
      id: nanoid(),
      teamId: team.id,
      owner: user.id,
      eventId: newEventId,
      categoryId: prod.categoryId ? categoryMap[prod.categoryId] : null,
      locationId: prod.locationId ? locationMap[prod.locationId] : null,
      title: prod.title,
      description: prod.description,
      price: prod.price,
      isActive: prod.isActive,
      requiresRemark: prod.requiresRemark,
      remarkPrompt: prod.remarkPrompt,
      hasOptions: prod.hasOptions,
      multipleOptionsAllowed: prod.multipleOptionsAllowed,
      sortOrder: prod.sortOrder,
      createdBy: user.id,
      updatedBy: user.id
    })
  }

  // Printers (only if location was mapped)
  const printers = await db
    .select()
    .from(salesPrinters)
    .where(eq(salesPrinters.eventId, eventId))

  for (const printer of printers) {
    const newLocationId = locationMap[printer.locationId]
    if (!newLocationId) continue

    await db.insert(salesPrinters).values({
      id: nanoid(),
      teamId: team.id,
      owner: user.id,
      eventId: newEventId,
      locationId: newLocationId,
      title: printer.title,
      ipAddress: printer.ipAddress,
      ...(printer.port && { port: printer.port }),
      ...(printer.status && { status: printer.status }),
      ...(printer.showPrices !== null && { showPrices: printer.showPrices }),
      ...(printer.isActive !== null && { isActive: printer.isActive }),
      createdBy: user.id,
      updatedBy: user.id
    })
  }

  return newEvent
})
