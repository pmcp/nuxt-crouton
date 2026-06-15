// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentAtelier, NewContentAtelier } from '../../types'
import * as categoriesSchema from '../../../categories/server/database/schema'
import { user } from '~~/server/db/schema'
import * as personsSchema from '../../../persons/server/database/schema'

export async function getAllContentAteliers(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const ateliers = await (db as any)
    .select({
      ...tables.contentAteliers,
      categoryData: categoriesSchema.contentCategories,
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
    .from(tables.contentAteliers)
    .leftJoin(categoriesSchema.contentCategories, eq(tables.contentAteliers.category, categoriesSchema.contentCategories.id))
    .leftJoin(ownerUser, eq(tables.contentAteliers.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentAteliers.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentAteliers.updatedBy, updatedByUser.id))
    .where(eq(tables.contentAteliers.teamId, teamId))
    .orderBy(desc(tables.contentAteliers.createdAt))

  // Post-query processing for array references
  if (ateliers.length > 0) {
    // Post-process array references to persons
    const allPersonsIds = new Set()
    ateliers.forEach(item => {
        if (item.persons) {
          try {
            const ids = typeof item.persons === 'string'
              ? JSON.parse(item.persons)
              : item.persons
            if (Array.isArray(ids)) {
              ids.forEach(id => allPersonsIds.add(id))
            }
          } catch (e) {
            // Handle parsing errors gracefully
            console.error('Error parsing persons:', e)
          }
        }
      })

    if (allPersonsIds.size > 0) {
      const relatedPersons = await db
        .select()
        .from(personsSchema.contentPersons)
        .where(inArray(personsSchema.contentPersons.id, Array.from(allPersonsIds)))

      ateliers.forEach(item => {
        item.personsData = []
        if (item.persons) {
          try {
            const ids = typeof item.persons === 'string'
              ? JSON.parse(item.persons)
              : item.persons
            if (Array.isArray(ids)) {
              item.personsData = relatedPersons.filter(r => ids.includes(r.id))
            }
          } catch (e) {
            console.error('Error mapping persons:', e)
          }
        }
      })
    }
  }

  return ateliers
}

export async function getContentAteliersByIds(teamId: string, atelierIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const ateliers = await (db as any)
    .select({
      ...tables.contentAteliers,
      categoryData: categoriesSchema.contentCategories,
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
    .from(tables.contentAteliers)
    .leftJoin(categoriesSchema.contentCategories, eq(tables.contentAteliers.category, categoriesSchema.contentCategories.id))
    .leftJoin(ownerUser, eq(tables.contentAteliers.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentAteliers.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentAteliers.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentAteliers.teamId, teamId),
        inArray(tables.contentAteliers.id, atelierIds)
      )
    )
    .orderBy(desc(tables.contentAteliers.createdAt))

  // Post-query processing for array references
  if (ateliers.length > 0) {
    // Post-process array references to persons
    const allPersonsIds = new Set()
    ateliers.forEach(item => {
        if (item.persons) {
          try {
            const ids = typeof item.persons === 'string'
              ? JSON.parse(item.persons)
              : item.persons
            if (Array.isArray(ids)) {
              ids.forEach(id => allPersonsIds.add(id))
            }
          } catch (e) {
            // Handle parsing errors gracefully
            console.error('Error parsing persons:', e)
          }
        }
      })

    if (allPersonsIds.size > 0) {
      const relatedPersons = await db
        .select()
        .from(personsSchema.contentPersons)
        .where(inArray(personsSchema.contentPersons.id, Array.from(allPersonsIds)))

      ateliers.forEach(item => {
        item.personsData = []
        if (item.persons) {
          try {
            const ids = typeof item.persons === 'string'
              ? JSON.parse(item.persons)
              : item.persons
            if (Array.isArray(ids)) {
              item.personsData = relatedPersons.filter(r => ids.includes(r.id))
            }
          } catch (e) {
            console.error('Error mapping persons:', e)
          }
        }
      })
    }
  }

  return ateliers
}

export async function createContentAtelier(data: NewContentAtelier) {
  const db = useDB()

  const [atelier] = await (db as any)
    .insert(tables.contentAteliers)
    .values(data)
    .returning()

  return atelier
}

export async function updateContentAtelier(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentAtelier>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentAteliers.id, recordId),
    eq(tables.contentAteliers.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentAteliers.owner, userId))
  }

  const [atelier] = await (db as any)
    .update(tables.contentAteliers)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!atelier) {
    throw createError({
      status: 404,
      statusText: 'ContentAtelier not found or unauthorized'
    })
  }

  return atelier
}

export async function deleteContentAtelier(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentAteliers.id, recordId),
    eq(tables.contentAteliers.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentAteliers.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentAteliers)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentAtelier not found or unauthorized'
    })
  }

  return { success: true }
}