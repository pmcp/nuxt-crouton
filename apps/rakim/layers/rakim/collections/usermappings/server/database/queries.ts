// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DiscubotUserMapping, NewDiscubotUserMapping } from '../../types'
import { users } from '~~/server/database/schema'

export async function getAllDiscubotUserMappings(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const usermappings = await db
    .select({
      ...tables.discubotUsermappings,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl
      }
    })
    .from(tables.discubotUsermappings)
    .leftJoin(ownerUsers, eq(tables.discubotUsermappings.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotUsermappings.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotUsermappings.updatedBy, updatedByUsers.id))
    .where(eq(tables.discubotUsermappings.teamId, teamId))
    .orderBy(desc(tables.discubotUsermappings.createdAt))

  return usermappings
}

export async function getDiscubotUserMappingsByIds(teamId: string, usermappingIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const usermappings = await db
    .select({
      ...tables.discubotUsermappings,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl
      }
    })
    .from(tables.discubotUsermappings)
    .leftJoin(ownerUsers, eq(tables.discubotUsermappings.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotUsermappings.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotUsermappings.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.discubotUsermappings.teamId, teamId),
        inArray(tables.discubotUsermappings.id, usermappingIds)
      )
    )
    .orderBy(desc(tables.discubotUsermappings.createdAt))

  return usermappings
}

export async function createDiscubotUserMapping(data: NewDiscubotUserMapping & { createdBy?: string; updatedBy?: string }) {
  const db = useDB()

  // Ensure audit fields are set (defaulting to owner if not provided)
  const insertData = {
    ...data,
    createdBy: data.createdBy || data.owner,
    updatedBy: data.updatedBy || data.owner,
  }

  const [usermapping] = await db
    .insert(tables.discubotUsermappings)
    .values(insertData)
    .returning()

  return usermapping
}

export async function updateDiscubotUserMapping(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DiscubotUserMapping>
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
    .update(tables.discubotUsermappings)
    .set(setData)
    .where(
      and(
        eq(tables.discubotUsermappings.id, recordId),
        eq(tables.discubotUsermappings.teamId, teamId),
        or(
          eq(tables.discubotUsermappings.owner, ownerId),
          eq(tables.discubotUsermappings.owner, 'system')
        )
      )
    )
    .returning()

  if (!usermapping) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotUserMapping not found or unauthorized'
    })
  }

  return usermapping
}

export async function deleteDiscubotUserMapping(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()
  const { or } = await import('drizzle-orm')

  // Allow delete if user owns the record OR it's a system-owned (discovered) mapping
  const [deleted] = await db
    .delete(tables.discubotUsermappings)
    .where(
      and(
        eq(tables.discubotUsermappings.id, recordId),
        eq(tables.discubotUsermappings.teamId, teamId),
        or(
          eq(tables.discubotUsermappings.owner, ownerId),
          eq(tables.discubotUsermappings.owner, 'system')
        )
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotUserMapping not found or unauthorized'
    })
  }

  return { success: true }
}