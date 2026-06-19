// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { LibraryCatalogBook, NewLibraryCatalogBook } from '../../types'
import { user } from '~~/server/db/schema'

// Overload order matters: the paginated signature (required `limit`) must come
// first so non-paginated calls fall through to the array overload.
export async function getAllLibraryCatalogBooks(teamId: string, opts: { limit: number; offset?: number }): Promise<{ items: any[]; total: number }>
export async function getAllLibraryCatalogBooks(teamId: string, opts?: {}): Promise<any[]>
export async function getAllLibraryCatalogBooks(teamId: string, opts: { limit?: number; offset?: number } = {}) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')
  const conditions = [eq(tables.libraryCatalogBooks.teamId, teamId)]
  const whereExpr = and(...conditions)

  let listQuery = (db as any)
    .select({
      ...tables.libraryCatalogBooks,
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
    .from(tables.libraryCatalogBooks)
    .leftJoin(ownerUser, eq(tables.libraryCatalogBooks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.libraryCatalogBooks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.libraryCatalogBooks.updatedBy, updatedByUser.id))
    .where(whereExpr)
    .orderBy(desc(tables.libraryCatalogBooks.createdAt))

  if (opts.limit != null) {
    listQuery = listQuery.limit(opts.limit).offset(opts.offset ?? 0)
  }

  const books = await listQuery

  if (opts.limit != null) {
    const [countRow] = await (db as any)
      .select({ count: sql`count(*)` })
      .from(tables.libraryCatalogBooks)
      .where(whereExpr)
    return { items: books, total: Number(countRow?.count ?? 0) }
  }

  return books
}

export async function getLibraryCatalogBooksByIds(teamId: string, bookIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const books = await (db as any)
    .select({
      ...tables.libraryCatalogBooks,
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
    .from(tables.libraryCatalogBooks)
    .leftJoin(ownerUser, eq(tables.libraryCatalogBooks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.libraryCatalogBooks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.libraryCatalogBooks.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.libraryCatalogBooks.teamId, teamId),
        inArray(tables.libraryCatalogBooks.id, bookIds)
      )
    )
    .orderBy(desc(tables.libraryCatalogBooks.createdAt))

  return books
}

export async function createLibraryCatalogBook(data: NewLibraryCatalogBook) {
  const db = useDB()

  const [book] = await (db as any)
    .insert(tables.libraryCatalogBooks)
    .values(data)
    .returning()

  return book
}

export async function updateLibraryCatalogBook(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<LibraryCatalogBook>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.libraryCatalogBooks.id, recordId),
    eq(tables.libraryCatalogBooks.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.libraryCatalogBooks.owner, userId))
  }

  const [book] = await (db as any)
    .update(tables.libraryCatalogBooks)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!book) {
    throw createError({
      status: 404,
      statusText: 'LibraryCatalogBook not found or unauthorized'
    })
  }

  return book
}

export async function deleteLibraryCatalogBook(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.libraryCatalogBooks.id, recordId),
    eq(tables.libraryCatalogBooks.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.libraryCatalogBooks.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.libraryCatalogBooks)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'LibraryCatalogBook not found or unauthorized'
    })
  }

  return { success: true }
}