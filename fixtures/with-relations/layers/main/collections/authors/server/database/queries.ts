// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { MainAuthor, NewMainAuthor } from '../../types'
import { user } from '~~/server/db/schema'

// Overload order matters: the paginated signature (required `limit`) must come
// first so non-paginated calls fall through to the array overload.
export async function getAllMainAuthors(teamId: string, opts: { limit: number; offset?: number }): Promise<{ items: any[]; total: number }>
export async function getAllMainAuthors(teamId: string, opts?: {}): Promise<any[]>
export async function getAllMainAuthors(teamId: string, opts: { limit?: number; offset?: number } = {}) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')
  const conditions = [eq(tables.mainAuthors.teamId, teamId)]
  const whereExpr = and(...conditions)

  let listQuery = (db as any)
    .select({
      ...tables.mainAuthors,
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
    .from(tables.mainAuthors)
    .leftJoin(ownerUser, eq(tables.mainAuthors.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.mainAuthors.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.mainAuthors.updatedBy, updatedByUser.id))
    .where(whereExpr)
    .orderBy(desc(tables.mainAuthors.createdAt))

  if (opts.limit != null) {
    listQuery = listQuery.limit(opts.limit).offset(opts.offset ?? 0)
  }

  const authors = await listQuery

  if (opts.limit != null) {
    const [countRow] = await (db as any)
      .select({ count: sql`count(*)` })
      .from(tables.mainAuthors)
      .where(whereExpr)
    return { items: authors, total: Number(countRow?.count ?? 0) }
  }

  return authors
}

export async function getMainAuthorsByIds(teamId: string, authorIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const authors = await (db as any)
    .select({
      ...tables.mainAuthors,
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
    .from(tables.mainAuthors)
    .leftJoin(ownerUser, eq(tables.mainAuthors.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.mainAuthors.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.mainAuthors.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.mainAuthors.teamId, teamId),
        inArray(tables.mainAuthors.id, authorIds)
      )
    )
    .orderBy(desc(tables.mainAuthors.createdAt))

  return authors
}

export async function createMainAuthor(data: NewMainAuthor) {
  const db = useDB()

  const [author] = await (db as any)
    .insert(tables.mainAuthors)
    .values(data)
    .returning()

  return author
}

export async function updateMainAuthor(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<MainAuthor>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.mainAuthors.id, recordId),
    eq(tables.mainAuthors.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.mainAuthors.owner, userId))
  }

  const [author] = await (db as any)
    .update(tables.mainAuthors)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!author) {
    throw createError({
      status: 404,
      statusText: 'MainAuthor not found or unauthorized'
    })
  }

  return author
}

export async function deleteMainAuthor(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.mainAuthors.id, recordId),
    eq(tables.mainAuthors.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.mainAuthors.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.mainAuthors)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'MainAuthor not found or unauthorized'
    })
  }

  return { success: true }
}