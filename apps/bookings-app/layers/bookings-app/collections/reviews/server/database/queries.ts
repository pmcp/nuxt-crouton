// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsAppReview, NewBookingsAppReview } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingsAppReviews(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const reviews = await (db as any)
    .select({
      ...tables.bookingsAppReviews,
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
    .from(tables.bookingsAppReviews)
    .leftJoin(ownerUser, eq(tables.bookingsAppReviews.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppReviews.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppReviews.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsAppReviews.teamId, teamId))
    .orderBy(desc(tables.bookingsAppReviews.createdAt))

  return reviews
}

export async function getBookingsAppReviewsByIds(teamId: string, reviewIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const reviews = await (db as any)
    .select({
      ...tables.bookingsAppReviews,
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
    .from(tables.bookingsAppReviews)
    .leftJoin(ownerUser, eq(tables.bookingsAppReviews.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppReviews.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppReviews.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsAppReviews.teamId, teamId),
        inArray(tables.bookingsAppReviews.id, reviewIds)
      )
    )
    .orderBy(desc(tables.bookingsAppReviews.createdAt))

  return reviews
}

export async function createBookingsAppReview(data: NewBookingsAppReview) {
  const db = useDB()

  const [review] = await (db as any)
    .insert(tables.bookingsAppReviews)
    .values(data)
    .returning()

  return review
}

export async function updateBookingsAppReview(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsAppReview>
) {
  const db = useDB()

  const [review] = await (db as any)
    .update(tables.bookingsAppReviews)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsAppReviews.id, recordId),
        eq(tables.bookingsAppReviews.teamId, teamId),
        eq(tables.bookingsAppReviews.owner, ownerId)
      )
    )
    .returning()

  if (!review) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppReview not found or unauthorized'
    })
  }

  return review
}

export async function deleteBookingsAppReview(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsAppReviews)
    .where(
      and(
        eq(tables.bookingsAppReviews.id, recordId),
        eq(tables.bookingsAppReviews.teamId, teamId),
        eq(tables.bookingsAppReviews.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppReview not found or unauthorized'
    })
  }

  return { success: true }
}