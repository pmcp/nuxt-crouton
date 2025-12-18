// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundTag, NewPlaygroundTag } from '../../types'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundTags(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(user, 'ownerUsers')
  const createdByUsers = alias(user, 'createdByUsers')
  const updatedByUsers = alias(user, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const tags = await db
    .select({
      ...tables.playgroundTags,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl
      }
    })
    .from(tables.playgroundTags)
    .leftJoin(ownerUsers, eq(tables.playgroundTags.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.playgroundTags.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.playgroundTags.updatedBy, updatedByUsers.id))
    .where(eq(tables.playgroundTags.teamId, teamId))
    .orderBy(asc(tables.playgroundTags.order), desc(tables.playgroundTags.createdAt))

  return tags
}

export async function getPlaygroundTagsByIds(teamId: string, tagIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(user, 'ownerUsers')
  const createdByUsers = alias(user, 'createdByUsers')
  const updatedByUsers = alias(user, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const tags = await db
    .select({
      ...tables.playgroundTags,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl
      }
    })
    .from(tables.playgroundTags)
    .leftJoin(ownerUsers, eq(tables.playgroundTags.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.playgroundTags.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.playgroundTags.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.playgroundTags.teamId, teamId),
        inArray(tables.playgroundTags.id, tagIds)
      )
    )
    .orderBy(asc(tables.playgroundTags.order), desc(tables.playgroundTags.createdAt))

  return tags
}

export async function createPlaygroundTag(data: NewPlaygroundTag) {
  const db = useDB()

  const [tag] = await db
    .insert(tables.playgroundTags)
    .values(data)
    .returning()

  return tag
}

export async function updatePlaygroundTag(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<PlaygroundTag>
) {
  const db = useDB()

  const [tag] = await db
    .update(tables.playgroundTags)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.playgroundTags.id, recordId),
        eq(tables.playgroundTags.teamId, teamId),
        eq(tables.playgroundTags.owner, ownerId)
      )
    )
    .returning()

  if (!tag) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundTag not found or unauthorized'
    })
  }

  return tag
}

export async function deletePlaygroundTag(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.playgroundTags)
    .where(
      and(
        eq(tables.playgroundTags.id, recordId),
        eq(tables.playgroundTags.teamId, teamId),
        eq(tables.playgroundTags.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundTag not found or unauthorized'
    })
  }

  return { success: true }
}

// Sortable reorder queries (auto-generated when sortable: true)

export async function reorderSiblingsPlaygroundTags(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = await Promise.all(
    updates.map(({ id, order }) =>
      db
        .update(tables.playgroundTags)
        .set({ order })
        .where(
          and(
            eq(tables.playgroundTags.id, id),
            eq(tables.playgroundTags.teamId, teamId)
          )
        )
        .returning()
    )
  )

  return { success: true, updated: results.flat().length }
}