// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BlogPost, NewBlogPost } from '../../types'
import { user } from '~~/server/database/schema'

export async function getAllBlogPosts(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const posts = await (db as any)
    .select({
      ...tables.blogPosts,
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
    .from(tables.blogPosts)
    .leftJoin(ownerUser, eq(tables.blogPosts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.blogPosts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.blogPosts.updatedBy, updatedByUser.id))
    .where(eq(tables.blogPosts.teamId, teamId))
    .orderBy(desc(tables.blogPosts.createdAt))

  return posts
}

export async function getBlogPostsByIds(teamId: string, postIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const posts = await (db as any)
    .select({
      ...tables.blogPosts,
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
    .from(tables.blogPosts)
    .leftJoin(ownerUser, eq(tables.blogPosts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.blogPosts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.blogPosts.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.blogPosts.teamId, teamId),
        inArray(tables.blogPosts.id, postIds)
      )
    )
    .orderBy(desc(tables.blogPosts.createdAt))

  return posts
}

export async function createBlogPost(data: NewBlogPost) {
  const db = useDB()

  const [post] = await (db as any)
    .insert(tables.blogPosts)
    .values(data)
    .returning()

  return post
}

export async function updateBlogPost(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BlogPost>
) {
  const db = useDB()

  const [post] = await (db as any)
    .update(tables.blogPosts)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.blogPosts.id, recordId),
        eq(tables.blogPosts.teamId, teamId),
        eq(tables.blogPosts.owner, ownerId)
      )
    )
    .returning()

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BlogPost not found or unauthorized'
    })
  }

  return post
}

export async function deleteBlogPost(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.blogPosts)
    .where(
      and(
        eq(tables.blogPosts.id, recordId),
        eq(tables.blogPosts.teamId, teamId),
        eq(tables.blogPosts.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BlogPost not found or unauthorized'
    })
  }

  return { success: true }
}