// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentCategorie, NewContentCategorie } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllContentCategories(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const categories = await (db as any)
    .select({
      ...tables.contentCategories,
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
    .from(tables.contentCategories)
    .leftJoin(ownerUser, eq(tables.contentCategories.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentCategories.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentCategories.updatedBy, updatedByUser.id))
    .where(eq(tables.contentCategories.teamId, teamId))
    .orderBy(desc(tables.contentCategories.createdAt))

  return categories
}

export async function getContentCategoriesByIds(teamId: string, categorieIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const categories = await (db as any)
    .select({
      ...tables.contentCategories,
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
    .from(tables.contentCategories)
    .leftJoin(ownerUser, eq(tables.contentCategories.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentCategories.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentCategories.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentCategories.teamId, teamId),
        inArray(tables.contentCategories.id, categorieIds)
      )
    )
    .orderBy(desc(tables.contentCategories.createdAt))

  return categories
}

export async function createContentCategorie(data: NewContentCategorie) {
  const db = useDB()

  const [categorie] = await (db as any)
    .insert(tables.contentCategories)
    .values(data)
    .returning()

  return categorie
}

export async function updateContentCategorie(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentCategorie>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentCategories.id, recordId),
    eq(tables.contentCategories.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentCategories.owner, userId))
  }

  const [categorie] = await (db as any)
    .update(tables.contentCategories)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!categorie) {
    throw createError({
      status: 404,
      statusText: 'ContentCategorie not found or unauthorized'
    })
  }

  return categorie
}

export async function deleteContentCategorie(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentCategories.id, recordId),
    eq(tables.contentCategories.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentCategories.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentCategories)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentCategorie not found or unauthorized'
    })
  }

  return { success: true }
}