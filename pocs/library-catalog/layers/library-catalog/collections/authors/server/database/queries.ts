// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { LibraryCatalogAuthor, NewLibraryCatalogAuthor } from '../../types'
import { user } from '~~/server/db/schema'

// Overload order matters: the paginated signature (required `limit`) must come
// first so non-paginated calls fall through to the array overload.
export async function getAllLibraryCatalogAuthors(teamId: string, opts: { limit: number; offset?: number }): Promise<{ items: any[]; total: number }>
export async function getAllLibraryCatalogAuthors(teamId: string, opts?: {}): Promise<any[]>
export async function getAllLibraryCatalogAuthors(teamId: string, opts: { limit?: number; offset?: number } = {}) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')
  const conditions = [eq(tables.libraryCatalogAuthors.teamId, teamId)]
  const whereExpr = and(...conditions)

  let listQuery = (db as any)
    .select({
      ...tables.libraryCatalogAuthors,
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
    .from(tables.libraryCatalogAuthors)
    .leftJoin(ownerUser, eq(tables.libraryCatalogAuthors.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.libraryCatalogAuthors.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.libraryCatalogAuthors.updatedBy, updatedByUser.id))
    .where(whereExpr)
    .orderBy(desc(tables.libraryCatalogAuthors.createdAt))

  if (opts.limit != null) {
    listQuery = listQuery.limit(opts.limit).offset(opts.offset ?? 0)
  }

  const authors = await listQuery

  if (opts.limit != null) {
    const [countRow] = await (db as any)
      .select({ count: sql`count(*)` })
      .from(tables.libraryCatalogAuthors)
      .where(whereExpr)
    return { items: authors, total: Number(countRow?.count ?? 0) }
  }

  return authors
}

export async function getLibraryCatalogAuthorsByIds(teamId: string, authorIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const authors = await (db as any)
    .select({
      ...tables.libraryCatalogAuthors,
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
    .from(tables.libraryCatalogAuthors)
    .leftJoin(ownerUser, eq(tables.libraryCatalogAuthors.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.libraryCatalogAuthors.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.libraryCatalogAuthors.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.libraryCatalogAuthors.teamId, teamId),
        inArray(tables.libraryCatalogAuthors.id, authorIds)
      )
    )
    .orderBy(desc(tables.libraryCatalogAuthors.createdAt))

  return authors
}

export async function createLibraryCatalogAuthor(data: NewLibraryCatalogAuthor) {
  const db = useDB()

  const [author] = await (db as any)
    .insert(tables.libraryCatalogAuthors)
    .values(data)
    .returning()

  return author
}

export async function updateLibraryCatalogAuthor(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<LibraryCatalogAuthor>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.libraryCatalogAuthors.id, recordId),
    eq(tables.libraryCatalogAuthors.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.libraryCatalogAuthors.owner, userId))
  }

  const [author] = await (db as any)
    .update(tables.libraryCatalogAuthors)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!author) {
    throw createError({
      status: 404,
      statusText: 'LibraryCatalogAuthor not found or unauthorized'
    })
  }

  return author
}

export async function deleteLibraryCatalogAuthor(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.libraryCatalogAuthors.id, recordId),
    eq(tables.libraryCatalogAuthors.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.libraryCatalogAuthors.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.libraryCatalogAuthors)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'LibraryCatalogAuthor not found or unauthorized'
    })
  }

  return { success: true }
}