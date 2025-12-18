// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundPost, NewPlaygroundPost } from '../../types'
import * as categoriesSchema from '../../../categories/server/database/schema'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundPosts(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(user, 'ownerUsers')
  const createdByUsers = alias(user, 'createdByUsers')
  const updatedByUsers = alias(user, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const posts = await db
    .select({
      ...tables.playgroundPosts,
      categoryIdData: categoriesSchema.playgroundCategories,
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
    .from(tables.playgroundPosts)
    .leftJoin(categoriesSchema.playgroundCategories, eq(tables.playgroundPosts.categoryId, categoriesSchema.playgroundCategories.id))
    .leftJoin(ownerUsers, eq(tables.playgroundPosts.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.playgroundPosts.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.playgroundPosts.updatedBy, updatedByUsers.id))
    .where(eq(tables.playgroundPosts.teamId, teamId))
    .orderBy(desc(tables.playgroundPosts.createdAt))

  return posts
}

export async function getPlaygroundPostsByIds(teamId: string, postIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(user, 'ownerUsers')
  const createdByUsers = alias(user, 'createdByUsers')
  const updatedByUsers = alias(user, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const posts = await db
    .select({
      ...tables.playgroundPosts,
      categoryIdData: categoriesSchema.playgroundCategories,
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
    .from(tables.playgroundPosts)
    .leftJoin(categoriesSchema.playgroundCategories, eq(tables.playgroundPosts.categoryId, categoriesSchema.playgroundCategories.id))
    .leftJoin(ownerUsers, eq(tables.playgroundPosts.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.playgroundPosts.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.playgroundPosts.updatedBy, updatedByUsers.id))
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

  const [post] = await db
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

  const [post] = await db
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

  const [deleted] = await db
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