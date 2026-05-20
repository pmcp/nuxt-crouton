// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesCategorie, NewSalesCategorie } from '../../types'
import * as eventsSchema from '../../../events/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllSalesCategories(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const categories = await (db as any)
    .select({
      ...tables.salesCategories,
      eventIdData: eventsSchema.salesEvents,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      },
      createdByUser: {
        id: createdByUser.id,
        name: createdByUser.name,
        email: createdByUser.email,
        image: createdByUser.image
      },
      updatedByUser: {
        id: updatedByUser.id,
        name: updatedByUser.name,
        email: updatedByUser.email,
        image: updatedByUser.image
      }
    } as any)
    .from(tables.salesCategories)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesCategories.eventId, eventsSchema.salesEvents.id))
    .leftJoin(ownerUser, eq(tables.salesCategories.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesCategories.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesCategories.updatedBy, updatedByUser.id))
    .where(eq(tables.salesCategories.teamId, teamId))
    .orderBy(desc(tables.salesCategories.createdAt))

  return categories
}

export async function getSalesCategoriesByIds(teamId: string, categorieIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const categories = await (db as any)
    .select({
      ...tables.salesCategories,
      eventIdData: eventsSchema.salesEvents,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      },
      createdByUser: {
        id: createdByUser.id,
        name: createdByUser.name,
        email: createdByUser.email,
        image: createdByUser.image
      },
      updatedByUser: {
        id: updatedByUser.id,
        name: updatedByUser.name,
        email: updatedByUser.email,
        image: updatedByUser.image
      }
    } as any)
    .from(tables.salesCategories)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesCategories.eventId, eventsSchema.salesEvents.id))
    .leftJoin(ownerUser, eq(tables.salesCategories.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesCategories.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesCategories.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesCategories.teamId, teamId),
        inArray(tables.salesCategories.id, categorieIds)
      )
    )
    .orderBy(desc(tables.salesCategories.createdAt))

  return categories
}

export async function createSalesCategorie(data: NewSalesCategorie) {
  const db = useDB()

  const [categorie] = await (db as any)
    .insert(tables.salesCategories)
    .values(data)
    .returning()

  return categorie
}

export async function updateSalesCategorie(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<SalesCategorie>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesCategories.id, recordId),
    eq(tables.salesCategories.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesCategories.owner, userId))
  }

  const [categorie] = await (db as any)
    .update(tables.salesCategories)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!categorie) {
    throw createError({
      status: 404,
      statusText: 'SalesCategorie not found or unauthorized'
    })
  }

  return categorie
}

export async function deleteSalesCategorie(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesCategories.id, recordId),
    eq(tables.salesCategories.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesCategories.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.salesCategories)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'SalesCategorie not found or unauthorized'
    })
  }

  return { success: true }
}