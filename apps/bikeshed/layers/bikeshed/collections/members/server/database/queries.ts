// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BikeshedMember, NewBikeshedMember } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBikeshedMembers(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const members = await (db as any)
    .select({
      ...tables.bikeshedMembers,
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
    .from(tables.bikeshedMembers)
    .leftJoin(ownerUser, eq(tables.bikeshedMembers.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedMembers.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedMembers.updatedBy, updatedByUser.id))
    .where(eq(tables.bikeshedMembers.teamId, teamId))
    .orderBy(desc(tables.bikeshedMembers.createdAt))

  return members
}

export async function getBikeshedMembersByIds(teamId: string, memberIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const members = await (db as any)
    .select({
      ...tables.bikeshedMembers,
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
    .from(tables.bikeshedMembers)
    .leftJoin(ownerUser, eq(tables.bikeshedMembers.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedMembers.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedMembers.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bikeshedMembers.teamId, teamId),
        inArray(tables.bikeshedMembers.id, memberIds)
      )
    )
    .orderBy(desc(tables.bikeshedMembers.createdAt))

  return members
}

export async function createBikeshedMember(data: NewBikeshedMember) {
  const db = useDB()

  const [member] = await (db as any)
    .insert(tables.bikeshedMembers)
    .values(data)
    .returning()

  return member
}

export async function updateBikeshedMember(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<BikeshedMember>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedMembers.id, recordId),
    eq(tables.bikeshedMembers.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedMembers.owner, userId))
  }

  const [member] = await (db as any)
    .update(tables.bikeshedMembers)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!member) {
    throw createError({
      status: 404,
      statusText: 'BikeshedMember not found or unauthorized'
    })
  }

  return member
}

export async function deleteBikeshedMember(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedMembers.id, recordId),
    eq(tables.bikeshedMembers.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedMembers.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bikeshedMembers)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BikeshedMember not found or unauthorized'
    })
  }

  return { success: true }
}