// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { KvrSetting, NewKvrSetting } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllKvrSettings(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const settings = await (db as any)
    .select({
      ...tables.kvrSettings,
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
    .from(tables.kvrSettings)
    .leftJoin(ownerUser, eq(tables.kvrSettings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.kvrSettings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.kvrSettings.updatedBy, updatedByUser.id))
    .where(eq(tables.kvrSettings.teamId, teamId))
    .orderBy(desc(tables.kvrSettings.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  settings.forEach((item: any) => {
      // Parse recipients from JSON string
      if (typeof item.recipients === 'string') {
        try {
          item.recipients = JSON.parse(item.recipients)
        } catch (e) {
          console.error('Error parsing recipients:', e)
          item.recipients = []
        }
      }
      if (item.recipients === null || item.recipients === undefined) {
        item.recipients = []
      }
  })

  return settings
}

export async function getKvrSettingsByIds(teamId: string, settingIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const settings = await (db as any)
    .select({
      ...tables.kvrSettings,
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
    .from(tables.kvrSettings)
    .leftJoin(ownerUser, eq(tables.kvrSettings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.kvrSettings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.kvrSettings.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.kvrSettings.teamId, teamId),
        inArray(tables.kvrSettings.id, settingIds)
      )
    )
    .orderBy(desc(tables.kvrSettings.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  settings.forEach((item: any) => {
      // Parse recipients from JSON string
      if (typeof item.recipients === 'string') {
        try {
          item.recipients = JSON.parse(item.recipients)
        } catch (e) {
          console.error('Error parsing recipients:', e)
          item.recipients = []
        }
      }
      if (item.recipients === null || item.recipients === undefined) {
        item.recipients = []
      }
  })

  return settings
}

export async function createKvrSetting(data: NewKvrSetting) {
  const db = useDB()

  const [setting] = await (db as any)
    .insert(tables.kvrSettings)
    .values(data)
    .returning()

  return setting
}

export async function updateKvrSetting(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<KvrSetting>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.kvrSettings.id, recordId),
    eq(tables.kvrSettings.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.kvrSettings.owner, userId))
  }

  const [setting] = await (db as any)
    .update(tables.kvrSettings)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!setting) {
    throw createError({
      status: 404,
      statusText: 'KvrSetting not found or unauthorized'
    })
  }

  return setting
}

export async function deleteKvrSetting(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.kvrSettings.id, recordId),
    eq(tables.kvrSettings.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.kvrSettings.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.kvrSettings)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'KvrSetting not found or unauthorized'
    })
  }

  return { success: true }
}