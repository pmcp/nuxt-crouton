// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsAppPromotion, NewBookingsAppPromotion } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingsAppPromotions(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const promotions = await (db as any)
    .select({
      ...tables.bookingsAppPromotions,
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
    .from(tables.bookingsAppPromotions)
    .leftJoin(ownerUser, eq(tables.bookingsAppPromotions.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppPromotions.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppPromotions.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsAppPromotions.teamId, teamId))
    .orderBy(desc(tables.bookingsAppPromotions.createdAt))

  return promotions
}

export async function getBookingsAppPromotionsByIds(teamId: string, promotionIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const promotions = await (db as any)
    .select({
      ...tables.bookingsAppPromotions,
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
    .from(tables.bookingsAppPromotions)
    .leftJoin(ownerUser, eq(tables.bookingsAppPromotions.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppPromotions.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppPromotions.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsAppPromotions.teamId, teamId),
        inArray(tables.bookingsAppPromotions.id, promotionIds)
      )
    )
    .orderBy(desc(tables.bookingsAppPromotions.createdAt))

  return promotions
}

export async function createBookingsAppPromotion(data: NewBookingsAppPromotion) {
  const db = useDB()

  const [promotion] = await (db as any)
    .insert(tables.bookingsAppPromotions)
    .values(data)
    .returning()

  return promotion
}

export async function updateBookingsAppPromotion(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsAppPromotion>
) {
  const db = useDB()

  const [promotion] = await (db as any)
    .update(tables.bookingsAppPromotions)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsAppPromotions.id, recordId),
        eq(tables.bookingsAppPromotions.teamId, teamId),
        eq(tables.bookingsAppPromotions.owner, ownerId)
      )
    )
    .returning()

  if (!promotion) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppPromotion not found or unauthorized'
    })
  }

  return promotion
}

export async function deleteBookingsAppPromotion(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsAppPromotions)
    .where(
      and(
        eq(tables.bookingsAppPromotions.id, recordId),
        eq(tables.bookingsAppPromotions.teamId, teamId),
        eq(tables.bookingsAppPromotions.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppPromotion not found or unauthorized'
    })
  }

  return { success: true }
}