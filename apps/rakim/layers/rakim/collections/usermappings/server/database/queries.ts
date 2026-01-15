// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimUserMapping, NewRakimUserMapping } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllRakimUserMappings(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const usermappings = await db
    .select({
      ...tables.rakimUsermappings,
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
    })
    .from(tables.rakimUsermappings)
    .leftJoin(ownerUser, eq(tables.rakimUsermappings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimUsermappings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimUsermappings.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimUsermappings.teamId, teamId))
    .orderBy(desc(tables.rakimUsermappings.createdAt))

  return usermappings
}

export async function getRakimUserMappingsByIds(teamId: string, usermappingIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const usermappings = await db
    .select({
      ...tables.rakimUsermappings,
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
    })
    .from(tables.rakimUsermappings)
    .leftJoin(ownerUser, eq(tables.rakimUsermappings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimUsermappings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimUsermappings.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimUsermappings.teamId, teamId),
        inArray(tables.rakimUsermappings.id, usermappingIds)
      )
    )
    .orderBy(desc(tables.rakimUsermappings.createdAt))

  return usermappings
}

export async function createRakimUserMapping(data: NewRakimUserMapping & { createdBy?: string; updatedBy?: string }) {
  const db = useDB()

  // Ensure audit fields are set (defaulting to owner if not provided)
  const insertData = {
    ...data,
    createdBy: data.createdBy || data.owner,
    updatedBy: data.updatedBy || data.owner,
  }

  const [usermapping] = await db
    .insert(tables.rakimUsermappings)
    .values(insertData)
    .returning()

  return usermapping
}

export async function updateRakimUserMapping(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimUserMapping>
) {
  const db = useDB()
  const { or } = await import('drizzle-orm')

  // Allow update if:
  // 1. User owns the record (ownerId matches), OR
  // 2. Record is owned by 'system' (discovered mappings can be claimed by any team member)
  // When claiming a system-owned mapping (setting notionUserId), transfer ownership to the user
  const setData: Record<string, any> = {
    ...updates,
    updatedBy: ownerId,
  }
  if (updates.notionUserId) {
    setData.owner = ownerId
  }

  const [usermapping] = await db
    .update(tables.rakimUsermappings)
    .set(setData)
    .where(
      and(
        eq(tables.rakimUsermappings.id, recordId),
        eq(tables.rakimUsermappings.teamId, teamId),
        or(
          eq(tables.rakimUsermappings.owner, ownerId),
          eq(tables.rakimUsermappings.owner, 'system')
        )
      )
    )
    .returning()

  if (!usermapping) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimUserMapping not found or unauthorized'
    })
  }

  return usermapping
}

export async function deleteRakimUserMapping(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()
  const { or } = await import('drizzle-orm')

  // Allow delete if user owns the record OR it's a system-owned (discovered) mapping
  const [deleted] = await db
    .delete(tables.rakimUsermappings)
    .where(
      and(
        eq(tables.rakimUsermappings.id, recordId),
        eq(tables.rakimUsermappings.teamId, teamId),
        or(
          eq(tables.rakimUsermappings.owner, ownerId),
          eq(tables.rakimUsermappings.owner, 'system')
        )
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimUserMapping not found or unauthorized'
    })
  }

  return { success: true }
}