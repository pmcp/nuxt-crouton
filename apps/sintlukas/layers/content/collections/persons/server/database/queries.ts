// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentPerson, NewContentPerson } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllContentPersons(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const persons = await (db as any)
    .select({
      ...tables.contentPersons,
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
    .from(tables.contentPersons)
    .leftJoin(ownerUser, eq(tables.contentPersons.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentPersons.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentPersons.updatedBy, updatedByUser.id))
    .where(eq(tables.contentPersons.teamId, teamId))
    .orderBy(desc(tables.contentPersons.createdAt))

  return persons
}

export async function getContentPersonsByIds(teamId: string, personIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const persons = await (db as any)
    .select({
      ...tables.contentPersons,
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
    .from(tables.contentPersons)
    .leftJoin(ownerUser, eq(tables.contentPersons.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentPersons.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentPersons.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentPersons.teamId, teamId),
        inArray(tables.contentPersons.id, personIds)
      )
    )
    .orderBy(desc(tables.contentPersons.createdAt))

  return persons
}

export async function createContentPerson(data: NewContentPerson) {
  const db = useDB()

  const [person] = await (db as any)
    .insert(tables.contentPersons)
    .values(data)
    .returning()

  return person
}

export async function updateContentPerson(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentPerson>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentPersons.id, recordId),
    eq(tables.contentPersons.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentPersons.owner, userId))
  }

  const [person] = await (db as any)
    .update(tables.contentPersons)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!person) {
    throw createError({
      status: 404,
      statusText: 'ContentPerson not found or unauthorized'
    })
  }

  return person
}

export async function deleteContentPerson(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentPersons.id, recordId),
    eq(tables.contentPersons.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentPersons.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentPersons)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentPerson not found or unauthorized'
    })
  }

  return { success: true }
}