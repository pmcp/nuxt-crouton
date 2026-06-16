// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { MainBook, NewMainBook } from '../../types'
import * as authorsSchema from '../../../authors/server/database/schema'
import { user } from '~~/server/db/schema'

// Overload order matters: the paginated signature (required `limit`) must come
// first so non-paginated calls fall through to the array overload.
export async function getAllMainBooks(teamId: string, opts: { authorId?: string; limit: number; offset?: number }): Promise<{ items: any[]; total: number }>
export async function getAllMainBooks(teamId: string, opts?: { authorId?: string }): Promise<any[]>
export async function getAllMainBooks(teamId: string, opts: { authorId?: string; limit?: number; offset?: number } = {}) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')
  const conditions = [eq(tables.mainBooks.teamId, teamId)]
  if (opts.authorId) conditions.push(eq(tables.mainBooks.authorId, opts.authorId))
  const whereExpr = and(...conditions)

  let listQuery = (db as any)
    .select({
      ...tables.mainBooks,
      authorIdData: authorsSchema.mainAuthors,
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
    .from(tables.mainBooks)
    .leftJoin(authorsSchema.mainAuthors, eq(tables.mainBooks.authorId, authorsSchema.mainAuthors.id))
    .leftJoin(ownerUser, eq(tables.mainBooks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.mainBooks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.mainBooks.updatedBy, updatedByUser.id))
    .where(whereExpr)
    .orderBy(desc(tables.mainBooks.createdAt))

  if (opts.limit != null) {
    listQuery = listQuery.limit(opts.limit).offset(opts.offset ?? 0)
  }

  const books = await listQuery

  if (opts.limit != null) {
    const [countRow] = await (db as any)
      .select({ count: sql`count(*)` })
      .from(tables.mainBooks)
      .where(whereExpr)
    return { items: books, total: Number(countRow?.count ?? 0) }
  }

  return books
}

export async function getMainBooksByIds(teamId: string, bookIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const books = await (db as any)
    .select({
      ...tables.mainBooks,
      authorIdData: authorsSchema.mainAuthors,
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
    .from(tables.mainBooks)
    .leftJoin(authorsSchema.mainAuthors, eq(tables.mainBooks.authorId, authorsSchema.mainAuthors.id))
    .leftJoin(ownerUser, eq(tables.mainBooks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.mainBooks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.mainBooks.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.mainBooks.teamId, teamId),
        inArray(tables.mainBooks.id, bookIds)
      )
    )
    .orderBy(desc(tables.mainBooks.createdAt))

  return books
}

export async function createMainBook(data: NewMainBook) {
  const db = useDB()

  const [book] = await (db as any)
    .insert(tables.mainBooks)
    .values(data)
    .returning()

  return book
}

export async function updateMainBook(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<MainBook>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.mainBooks.id, recordId),
    eq(tables.mainBooks.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.mainBooks.owner, userId))
  }

  const [book] = await (db as any)
    .update(tables.mainBooks)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!book) {
    throw createError({
      status: 404,
      statusText: 'MainBook not found or unauthorized'
    })
  }

  return book
}

export async function deleteMainBook(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.mainBooks.id, recordId),
    eq(tables.mainBooks.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.mainBooks.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.mainBooks)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'MainBook not found or unauthorized'
    })
  }

  return { success: true }
}