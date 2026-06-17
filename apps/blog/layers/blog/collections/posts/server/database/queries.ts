// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BlogPost, NewBlogPost } from '../../types'
import { user } from '~~/server/db/schema'

// Overload order matters: the paginated signature (required `limit`) must come
// first so non-paginated calls fall through to the array overload.
export async function getAllBlogPosts(teamId: string, opts: { limit: number; offset?: number }): Promise<{ items: any[]; total: number }>
export async function getAllBlogPosts(teamId: string, opts?: {}): Promise<any[]>
export async function getAllBlogPosts(teamId: string, opts: { limit?: number; offset?: number } = {}) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')
  const conditions = [eq(tables.blogPosts.teamId, teamId)]
  const whereExpr = and(...conditions)

  let listQuery = (db as any)
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
    .where(whereExpr)
    .orderBy(desc(tables.blogPosts.createdAt))

  if (opts.limit != null) {
    listQuery = listQuery.limit(opts.limit).offset(opts.offset ?? 0)
  }

  const posts = await listQuery

  if (opts.limit != null) {
    const [countRow] = await (db as any)
      .select({ count: sql`count(*)` })
      .from(tables.blogPosts)
      .where(whereExpr)
    return { items: posts, total: Number(countRow?.count ?? 0) }
  }

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
  userId: string,
  updates: Partial<BlogPost>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.blogPosts.id, recordId),
    eq(tables.blogPosts.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.blogPosts.owner, userId))
  }

  const [post] = await (db as any)
    .update(tables.blogPosts)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!post) {
    throw createError({
      status: 404,
      statusText: 'BlogPost not found or unauthorized'
    })
  }

  return post
}

export async function deleteBlogPost(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.blogPosts.id, recordId),
    eq(tables.blogPosts.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.blogPosts.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.blogPosts)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BlogPost not found or unauthorized'
    })
  }

  return { success: true }
}