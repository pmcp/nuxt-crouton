// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundTag, NewPlaygroundTag } from '../../types'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundTags(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const tags = await (db as any)
    .select({
      ...tables.playgroundTags,
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
    .from(tables.playgroundTags)
    .leftJoin(ownerUser, eq(tables.playgroundTags.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundTags.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundTags.updatedBy, updatedByUser.id))
    .where(eq(tables.playgroundTags.teamId, teamId))
    .orderBy(asc(tables.playgroundTags.order), desc(tables.playgroundTags.createdAt))

  return tags
}

export async function getPlaygroundTagsByIds(teamId: string, tagIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const tags = await (db as any)
    .select({
      ...tables.playgroundTags,
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
    .from(tables.playgroundTags)
    .leftJoin(ownerUser, eq(tables.playgroundTags.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundTags.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundTags.updatedBy, updatedByUser.id))
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

  const [tag] = await (db as any)
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

  const [tag] = await (db as any)
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

  const [deleted] = await (db as any)
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
      (db as any)
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