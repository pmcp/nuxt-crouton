// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsAsset, NewBookingsAsset } from '../../types'
import * as organisationsSchema from '../../../organisations/server/database/schema'
import * as usersSchema from '../../../users/server/database/schema'

export async function getAllBookingsAssets(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const assets = await (db as any)
    .select({
      ...tables.bookingsAssets,
      teamIdData: organisationsSchema.bookingsOrganisations,
      userIdData: usersSchema.bookingsUsers,
      updatedByData: usersSchema.bookingsUsers,
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
    .from(tables.bookingsAssets)
    .leftJoin(organisationsSchema.bookingsOrganisations, eq(tables.bookingsAssets.teamId, organisationsSchema.bookingsOrganisations.id))
    .leftJoin(usersSchema.bookingsUsers, eq(tables.bookingsAssets.userId, usersSchema.bookingsUsers.id))
    .leftJoin(usersSchema.bookingsUsers, eq(tables.bookingsAssets.updatedBy, usersSchema.bookingsUsers.id))
    .leftJoin(ownerUser, eq(tables.bookingsAssets.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAssets.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAssets.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsAssets.teamId, teamId))
    .orderBy(desc(tables.bookingsAssets.createdAt))

  return assets
}

export async function getBookingsAssetsByIds(teamId: string, assetIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const assets = await (db as any)
    .select({
      ...tables.bookingsAssets,
      teamIdData: organisationsSchema.bookingsOrganisations,
      userIdData: usersSchema.bookingsUsers,
      updatedByData: usersSchema.bookingsUsers,
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
    .from(tables.bookingsAssets)
    .leftJoin(organisationsSchema.bookingsOrganisations, eq(tables.bookingsAssets.teamId, organisationsSchema.bookingsOrganisations.id))
    .leftJoin(usersSchema.bookingsUsers, eq(tables.bookingsAssets.userId, usersSchema.bookingsUsers.id))
    .leftJoin(usersSchema.bookingsUsers, eq(tables.bookingsAssets.updatedBy, usersSchema.bookingsUsers.id))
    .leftJoin(ownerUser, eq(tables.bookingsAssets.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAssets.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAssets.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsAssets.teamId, teamId),
        inArray(tables.bookingsAssets.id, assetIds)
      )
    )
    .orderBy(desc(tables.bookingsAssets.createdAt))

  return assets
}

export async function createBookingsAsset(data: NewBookingsAsset) {
  const db = useDB()

  const [asset] = await (db as any)
    .insert(tables.bookingsAssets)
    .values(data)
    .returning()

  return asset
}

export async function updateBookingsAsset(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsAsset>
) {
  const db = useDB()

  const [asset] = await (db as any)
    .update(tables.bookingsAssets)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsAssets.id, recordId),
        eq(tables.bookingsAssets.teamId, teamId),
        eq(tables.bookingsAssets.owner, ownerId)
      )
    )
    .returning()

  if (!asset) {
    throw createError({
      status: 404,
      statusText: 'BookingsAsset not found or unauthorized'
    })
  }

  return asset
}

export async function deleteBookingsAsset(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsAssets)
    .where(
      and(
        eq(tables.bookingsAssets.id, recordId),
        eq(tables.bookingsAssets.teamId, teamId),
        eq(tables.bookingsAssets.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BookingsAsset not found or unauthorized'
    })
  }

  return { success: true }
}