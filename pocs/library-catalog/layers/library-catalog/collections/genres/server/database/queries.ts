// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { LibraryCatalogGenre, NewLibraryCatalogGenre } from '../../types'
import { user } from '~~/server/db/schema'

// Overload order matters: the paginated signature (required `limit`) must come
// first so non-paginated calls fall through to the array overload.
export async function getAllLibraryCatalogGenres(teamId: string, opts: { limit: number; offset?: number }): Promise<{ items: any[]; total: number }>
export async function getAllLibraryCatalogGenres(teamId: string, opts?: {}): Promise<any[]>
export async function getAllLibraryCatalogGenres(teamId: string, opts: { limit?: number; offset?: number } = {}) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')
  const conditions = [eq(tables.libraryCatalogGenres.teamId, teamId)]
  const whereExpr = and(...conditions)

  let listQuery = (db as any)
    .select({
      ...tables.libraryCatalogGenres,
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
    .from(tables.libraryCatalogGenres)
    .leftJoin(ownerUser, eq(tables.libraryCatalogGenres.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.libraryCatalogGenres.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.libraryCatalogGenres.updatedBy, updatedByUser.id))
    .where(whereExpr)
    .orderBy(desc(tables.libraryCatalogGenres.createdAt))

  if (opts.limit != null) {
    listQuery = listQuery.limit(opts.limit).offset(opts.offset ?? 0)
  }

  const genres = await listQuery

  if (opts.limit != null) {
    const [countRow] = await (db as any)
      .select({ count: sql`count(*)` })
      .from(tables.libraryCatalogGenres)
      .where(whereExpr)
    return { items: genres, total: Number(countRow?.count ?? 0) }
  }

  return genres
}

export async function getLibraryCatalogGenresByIds(teamId: string, genreIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const genres = await (db as any)
    .select({
      ...tables.libraryCatalogGenres,
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
    .from(tables.libraryCatalogGenres)
    .leftJoin(ownerUser, eq(tables.libraryCatalogGenres.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.libraryCatalogGenres.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.libraryCatalogGenres.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.libraryCatalogGenres.teamId, teamId),
        inArray(tables.libraryCatalogGenres.id, genreIds)
      )
    )
    .orderBy(desc(tables.libraryCatalogGenres.createdAt))

  return genres
}

export async function createLibraryCatalogGenre(data: NewLibraryCatalogGenre) {
  const db = useDB()

  const [genre] = await (db as any)
    .insert(tables.libraryCatalogGenres)
    .values(data)
    .returning()

  return genre
}

export async function updateLibraryCatalogGenre(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<LibraryCatalogGenre>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.libraryCatalogGenres.id, recordId),
    eq(tables.libraryCatalogGenres.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.libraryCatalogGenres.owner, userId))
  }

  const [genre] = await (db as any)
    .update(tables.libraryCatalogGenres)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!genre) {
    throw createError({
      status: 404,
      statusText: 'LibraryCatalogGenre not found or unauthorized'
    })
  }

  return genre
}

export async function deleteLibraryCatalogGenre(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.libraryCatalogGenres.id, recordId),
    eq(tables.libraryCatalogGenres.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.libraryCatalogGenres.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.libraryCatalogGenres)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'LibraryCatalogGenre not found or unauthorized'
    })
  }

  return { success: true }
}