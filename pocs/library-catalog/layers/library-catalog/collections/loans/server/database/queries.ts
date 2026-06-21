// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { LibraryCatalogLoan, NewLibraryCatalogLoan } from '../../types'
import * as booksSchema from '../../../books/server/database/schema'
import { user } from '~~/server/db/schema'

// Overload order matters: the paginated signature (required `limit`) must come
// first so non-paginated calls fall through to the array overload.
export async function getAllLibraryCatalogLoans(teamId: string, opts: { bookId?: string; limit: number; offset?: number }): Promise<{ items: any[]; total: number }>
export async function getAllLibraryCatalogLoans(teamId: string, opts?: { bookId?: string }): Promise<any[]>
export async function getAllLibraryCatalogLoans(teamId: string, opts: { bookId?: string; limit?: number; offset?: number } = {}) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')
  const conditions = [eq(tables.libraryCatalogLoans.teamId, teamId)]
  if (opts.bookId) conditions.push(eq(tables.libraryCatalogLoans.bookId, opts.bookId))
  const whereExpr = and(...conditions)

  let listQuery = (db as any)
    .select({
      ...tables.libraryCatalogLoans,
      bookIdData: booksSchema.libraryCatalogBooks,
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
    .from(tables.libraryCatalogLoans)
    .leftJoin(booksSchema.libraryCatalogBooks, eq(tables.libraryCatalogLoans.bookId, booksSchema.libraryCatalogBooks.id))
    .leftJoin(ownerUser, eq(tables.libraryCatalogLoans.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.libraryCatalogLoans.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.libraryCatalogLoans.updatedBy, updatedByUser.id))
    .where(whereExpr)
    .orderBy(desc(tables.libraryCatalogLoans.createdAt))

  if (opts.limit != null) {
    listQuery = listQuery.limit(opts.limit).offset(opts.offset ?? 0)
  }

  const loans = await listQuery

  if (opts.limit != null) {
    const [countRow] = await (db as any)
      .select({ count: sql`count(*)` })
      .from(tables.libraryCatalogLoans)
      .where(whereExpr)
    return { items: loans, total: Number(countRow?.count ?? 0) }
  }

  return loans
}

export async function getLibraryCatalogLoansByIds(teamId: string, loanIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const loans = await (db as any)
    .select({
      ...tables.libraryCatalogLoans,
      bookIdData: booksSchema.libraryCatalogBooks,
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
    .from(tables.libraryCatalogLoans)
    .leftJoin(booksSchema.libraryCatalogBooks, eq(tables.libraryCatalogLoans.bookId, booksSchema.libraryCatalogBooks.id))
    .leftJoin(ownerUser, eq(tables.libraryCatalogLoans.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.libraryCatalogLoans.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.libraryCatalogLoans.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.libraryCatalogLoans.teamId, teamId),
        inArray(tables.libraryCatalogLoans.id, loanIds)
      )
    )
    .orderBy(desc(tables.libraryCatalogLoans.createdAt))

  return loans
}

export async function createLibraryCatalogLoan(data: NewLibraryCatalogLoan) {
  const db = useDB()

  const [loan] = await (db as any)
    .insert(tables.libraryCatalogLoans)
    .values(data)
    .returning()

  return loan
}

export async function updateLibraryCatalogLoan(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<LibraryCatalogLoan>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.libraryCatalogLoans.id, recordId),
    eq(tables.libraryCatalogLoans.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.libraryCatalogLoans.owner, userId))
  }

  const [loan] = await (db as any)
    .update(tables.libraryCatalogLoans)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!loan) {
    throw createError({
      status: 404,
      statusText: 'LibraryCatalogLoan not found or unauthorized'
    })
  }

  return loan
}

export async function deleteLibraryCatalogLoan(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.libraryCatalogLoans.id, recordId),
    eq(tables.libraryCatalogLoans.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.libraryCatalogLoans.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.libraryCatalogLoans)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'LibraryCatalogLoan not found or unauthorized'
    })
  }

  return { success: true }
}