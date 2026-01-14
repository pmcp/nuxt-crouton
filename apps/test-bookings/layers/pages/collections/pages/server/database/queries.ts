// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PagesPage, NewPagesPage } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllPagesPages(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const pages = await (db as any)
    .select({
      ...tables.pagesPages,
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
    .from(tables.pagesPages)
    .leftJoin(ownerUser, eq(tables.pagesPages.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.pagesPages.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.pagesPages.updatedBy, updatedByUser.id))
    .where(eq(tables.pagesPages.teamId, teamId))
    .orderBy(asc(tables.pagesPages.order), desc(tables.pagesPages.createdAt))

  return pages
}

export async function getPagesPagesByIds(teamId: string, pageIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const pages = await (db as any)
    .select({
      ...tables.pagesPages,
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
    .from(tables.pagesPages)
    .leftJoin(ownerUser, eq(tables.pagesPages.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.pagesPages.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.pagesPages.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.pagesPages.teamId, teamId),
        inArray(tables.pagesPages.id, pageIds)
      )
    )
    .orderBy(asc(tables.pagesPages.order), desc(tables.pagesPages.createdAt))

  return pages
}

export async function createPagesPage(data: NewPagesPage) {
  const db = useDB()

  const [page] = await (db as any)
    .insert(tables.pagesPages)
    .values(data)
    .returning()

  return page
}

export async function updatePagesPage(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<PagesPage>
) {
  const db = useDB()

  const [page] = await (db as any)
    .update(tables.pagesPages)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.pagesPages.id, recordId),
        eq(tables.pagesPages.teamId, teamId),
        eq(tables.pagesPages.owner, ownerId)
      )
    )
    .returning()

  if (!page) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PagesPage not found or unauthorized'
    })
  }

  return page
}

export async function deletePagesPage(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.pagesPages)
    .where(
      and(
        eq(tables.pagesPages.id, recordId),
        eq(tables.pagesPages.teamId, teamId),
        eq(tables.pagesPages.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PagesPage not found or unauthorized'
    })
  }

  return { success: true }
}

// Sortable reorder queries (auto-generated when sortable: true)

export async function reorderSiblingsPagesPages(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = await Promise.all(
    updates.map(({ id, order }) =>
      (db as any)
        .update(tables.pagesPages)
        .set({ order })
        .where(
          and(
            eq(tables.pagesPages.id, id),
            eq(tables.pagesPages.teamId, teamId)
          )
        )
        .returning()
    )
  )

  return { success: true, updated: results.flat().length }
}