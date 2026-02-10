// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { TriageUserMapping, NewTriageUserMapping } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllTriageUserMappings(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const userMappings = await (db as any)
    .select({
      ...tables.triageUserMappings,
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
    .from(tables.triageUserMappings)
    .leftJoin(ownerUser, eq(tables.triageUserMappings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageUserMappings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageUserMappings.updatedBy, updatedByUser.id))
    .where(eq(tables.triageUserMappings.teamId, teamId))
    .orderBy(desc(tables.triageUserMappings.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  usermappings.forEach((item: any) => {
      // Parse metadata from JSON string
      if (typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata)
        } catch (e) {
          console.error('Error parsing metadata:', e)
          item.metadata = null
        }
      }
      if (item.metadata === null || item.metadata === undefined) {
        item.metadata = null
      }
  })

  return userMappings
}

export async function getTriageUserMappingsByIds(teamId: string, userMappingIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const userMappings = await (db as any)
    .select({
      ...tables.triageUserMappings,
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
    .from(tables.triageUserMappings)
    .leftJoin(ownerUser, eq(tables.triageUserMappings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageUserMappings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageUserMappings.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.triageUserMappings.teamId, teamId),
        inArray(tables.triageUserMappings.id, userMappingIds)
      )
    )
    .orderBy(desc(tables.triageUserMappings.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  usermappings.forEach((item: any) => {
      // Parse metadata from JSON string
      if (typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata)
        } catch (e) {
          console.error('Error parsing metadata:', e)
          item.metadata = null
        }
      }
      if (item.metadata === null || item.metadata === undefined) {
        item.metadata = null
      }
  })

  return userMappings
}

export async function createTriageUserMapping(data: NewTriageUserMapping) {
  const db = useDB()

  const [userMapping] = await (db as any)
    .insert(tables.triageUserMappings)
    .values(data)
    .returning()

  return userMapping
}

export async function updateTriageUserMapping(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<TriageUserMapping>
) {
  const db = useDB()

  const [userMapping] = await (db as any)
    .update(tables.triageUserMappings)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.triageUserMappings.id, recordId),
        eq(tables.triageUserMappings.teamId, teamId),
        eq(tables.triageUserMappings.owner, ownerId)
      )
    )
    .returning()

  if (!userMapping) {
    throw createError({
      status: 404,
      statusText: 'TriageUserMapping not found or unauthorized'
    })
  }

  return userMapping
}

export async function deleteTriageUserMapping(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.triageUserMappings)
    .where(
      and(
        eq(tables.triageUserMappings.id, recordId),
        eq(tables.triageUserMappings.teamId, teamId),
        eq(tables.triageUserMappings.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'TriageUserMapping not found or unauthorized'
    })
  }

  return { success: true }
}