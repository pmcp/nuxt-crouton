// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentNew, NewContentNew } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllContentNews(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const news = await (db as any)
    .select({
      ...tables.contentNews,
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
    .from(tables.contentNews)
    .leftJoin(ownerUser, eq(tables.contentNews.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentNews.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentNews.updatedBy, updatedByUser.id))
    .where(eq(tables.contentNews.teamId, teamId))
    .orderBy(desc(tables.contentNews.createdAt))

  return news
}

export async function getContentNewsByIds(teamId: string, newIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const news = await (db as any)
    .select({
      ...tables.contentNews,
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
    .from(tables.contentNews)
    .leftJoin(ownerUser, eq(tables.contentNews.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentNews.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentNews.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentNews.teamId, teamId),
        inArray(tables.contentNews.id, newIds)
      )
    )
    .orderBy(desc(tables.contentNews.createdAt))

  return news
}

export async function createContentNew(data: NewContentNew) {
  const db = useDB()

  const [new] = await (db as any)
    .insert(tables.contentNews)
    .values(data)
    .returning()

  return new
}

export async function updateContentNew(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentNew>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentNews.id, recordId),
    eq(tables.contentNews.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentNews.owner, userId))
  }

  const [new] = await (db as any)
    .update(tables.contentNews)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!new) {
    throw createError({
      status: 404,
      statusText: 'ContentNew not found or unauthorized'
    })
  }

  return new
}

export async function deleteContentNew(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentNews.id, recordId),
    eq(tables.contentNews.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentNews.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentNews)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentNew not found or unauthorized'
    })
  }

  return { success: true }
}