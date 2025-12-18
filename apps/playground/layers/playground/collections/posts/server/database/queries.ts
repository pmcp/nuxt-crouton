// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundPost, NewPlaygroundPost } from '../../types'
import * as categoriesSchema from '../../../categories/server/database/schema'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundPosts(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const posts = await (db as any)
    .select({
      ...tables.playgroundPosts,
      categoryIdData: categoriesSchema.playgroundCategories,
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
    .from(tables.playgroundPosts)
    .leftJoin(categoriesSchema.playgroundCategories, eq(tables.playgroundPosts.categoryId, categoriesSchema.playgroundCategories.id))
    .leftJoin(ownerUser, eq(tables.playgroundPosts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundPosts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundPosts.updatedBy, updatedByUser.id))
    .where(eq(tables.playgroundPosts.teamId, teamId))
    .orderBy(desc(tables.playgroundPosts.createdAt))

  return posts
}

export async function getPlaygroundPostsByIds(teamId: string, postIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const posts = await (db as any)
    .select({
      ...tables.playgroundPosts,
      categoryIdData: categoriesSchema.playgroundCategories,
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
    .from(tables.playgroundPosts)
    .leftJoin(categoriesSchema.playgroundCategories, eq(tables.playgroundPosts.categoryId, categoriesSchema.playgroundCategories.id))
    .leftJoin(ownerUser, eq(tables.playgroundPosts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundPosts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundPosts.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.playgroundPosts.teamId, teamId),
        inArray(tables.playgroundPosts.id, postIds)
      )
    )
    .orderBy(desc(tables.playgroundPosts.createdAt))

  return posts
}

export async function createPlaygroundPost(data: NewPlaygroundPost) {
  const db = useDB()

  const [post] = await (db as any)
    .insert(tables.playgroundPosts)
    .values(data)
    .returning()

  return post
}

export async function updatePlaygroundPost(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<PlaygroundPost>
) {
  const db = useDB()

  const [post] = await (db as any)
    .update(tables.playgroundPosts)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.playgroundPosts.id, recordId),
        eq(tables.playgroundPosts.teamId, teamId),
        eq(tables.playgroundPosts.owner, ownerId)
      )
    )
    .returning()

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundPost not found or unauthorized'
    })
  }

  return post
}

export async function deletePlaygroundPost(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.playgroundPosts)
    .where(
      and(
        eq(tables.playgroundPosts.id, recordId),
        eq(tables.playgroundPosts.teamId, teamId),
        eq(tables.playgroundPosts.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundPost not found or unauthorized'
    })
  }

  return { success: true }
}