// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentTag, NewContentTag } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllContentTags(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const tags = await (db as any)
    .select({
      ...tables.contentTags,
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
    .from(tables.contentTags)
    .leftJoin(ownerUser, eq(tables.contentTags.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentTags.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentTags.updatedBy, updatedByUser.id))
    .where(eq(tables.contentTags.teamId, teamId))
    .orderBy(desc(tables.contentTags.createdAt))

  return tags
}

export async function getContentTagsByIds(teamId: string, tagIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const tags = await (db as any)
    .select({
      ...tables.contentTags,
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
    .from(tables.contentTags)
    .leftJoin(ownerUser, eq(tables.contentTags.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentTags.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentTags.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentTags.teamId, teamId),
        inArray(tables.contentTags.id, tagIds)
      )
    )
    .orderBy(desc(tables.contentTags.createdAt))

  return tags
}

export async function createContentTag(data: NewContentTag) {
  const db = useDB()

  const [tag] = await (db as any)
    .insert(tables.contentTags)
    .values(data)
    .returning()

  return tag
}

export async function updateContentTag(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentTag>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentTags.id, recordId),
    eq(tables.contentTags.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentTags.owner, userId))
  }

  const [tag] = await (db as any)
    .update(tables.contentTags)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!tag) {
    throw createError({
      status: 404,
      statusText: 'ContentTag not found or unauthorized'
    })
  }

  return tag
}

export async function deleteContentTag(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentTags.id, recordId),
    eq(tables.contentTags.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentTags.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentTags)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentTag not found or unauthorized'
    })
  }

  return { success: true }
}