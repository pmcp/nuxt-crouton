// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentDownload, NewContentDownload } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllContentDownloads(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const downloads = await (db as any)
    .select({
      ...tables.contentDownloads,
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
    .from(tables.contentDownloads)
    .leftJoin(ownerUser, eq(tables.contentDownloads.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentDownloads.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentDownloads.updatedBy, updatedByUser.id))
    .where(eq(tables.contentDownloads.teamId, teamId))
    .orderBy(desc(tables.contentDownloads.createdAt))

  return downloads
}

export async function getContentDownloadsByIds(teamId: string, downloadIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const downloads = await (db as any)
    .select({
      ...tables.contentDownloads,
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
    .from(tables.contentDownloads)
    .leftJoin(ownerUser, eq(tables.contentDownloads.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentDownloads.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentDownloads.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentDownloads.teamId, teamId),
        inArray(tables.contentDownloads.id, downloadIds)
      )
    )
    .orderBy(desc(tables.contentDownloads.createdAt))

  return downloads
}

export async function createContentDownload(data: NewContentDownload) {
  const db = useDB()

  const [download] = await (db as any)
    .insert(tables.contentDownloads)
    .values(data)
    .returning()

  return download
}

export async function updateContentDownload(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentDownload>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentDownloads.id, recordId),
    eq(tables.contentDownloads.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentDownloads.owner, userId))
  }

  const [download] = await (db as any)
    .update(tables.contentDownloads)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!download) {
    throw createError({
      status: 404,
      statusText: 'ContentDownload not found or unauthorized'
    })
  }

  return download
}

export async function deleteContentDownload(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentDownloads.id, recordId),
    eq(tables.contentDownloads.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentDownloads.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentDownloads)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentDownload not found or unauthorized'
    })
  }

  return { success: true }
}