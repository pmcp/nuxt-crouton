// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { KvrWerkvergunningen, NewKvrWerkvergunningen } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllKvrWerkvergunningens(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const werkvergunningens = await (db as any)
    .select({
      ...tables.kvrWerkvergunningens,
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
    .from(tables.kvrWerkvergunningens)
    .leftJoin(ownerUser, eq(tables.kvrWerkvergunningens.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.kvrWerkvergunningens.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.kvrWerkvergunningens.updatedBy, updatedByUser.id))
    .where(eq(tables.kvrWerkvergunningens.teamId, teamId))
    .orderBy(desc(tables.kvrWerkvergunningens.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  werkvergunningens.forEach((item: any) => {
      // Parse cables from JSON string
      if (typeof item.cables === 'string') {
        try {
          item.cables = JSON.parse(item.cables)
        } catch (e) {
          console.error('Error parsing cables:', e)
          item.cables = []
        }
      }
      if (item.cables === null || item.cables === undefined) {
        item.cables = []
      }
      // Handtekening fields are plain data URL strings — no extra parsing needed
      // (the column's customType already handled deserialization)
      if (item.werkverantwoordelijkeHandtekening === undefined) {
        item.werkverantwoordelijkeHandtekening = null
      }
      if (item.schakelbevoegdeHandtekening === undefined) {
        item.schakelbevoegdeHandtekening = null
      }
      // Parse photos from JSON string
      if (typeof item.photos === 'string') {
        try {
          item.photos = JSON.parse(item.photos)
        } catch (e) {
          console.error('Error parsing photos:', e)
          item.photos = []
        }
      }
      if (item.photos === null || item.photos === undefined) {
        item.photos = []
      }
  })

  return werkvergunningens
}

export async function getKvrWerkvergunningensByIds(teamId: string, werkvergunningenIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const werkvergunningens = await (db as any)
    .select({
      ...tables.kvrWerkvergunningens,
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
    .from(tables.kvrWerkvergunningens)
    .leftJoin(ownerUser, eq(tables.kvrWerkvergunningens.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.kvrWerkvergunningens.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.kvrWerkvergunningens.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.kvrWerkvergunningens.teamId, teamId),
        inArray(tables.kvrWerkvergunningens.id, werkvergunningenIds)
      )
    )
    .orderBy(desc(tables.kvrWerkvergunningens.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  werkvergunningens.forEach((item: any) => {
      // Parse cables from JSON string
      if (typeof item.cables === 'string') {
        try {
          item.cables = JSON.parse(item.cables)
        } catch (e) {
          console.error('Error parsing cables:', e)
          item.cables = []
        }
      }
      if (item.cables === null || item.cables === undefined) {
        item.cables = []
      }
      // Handtekening fields are plain data URL strings — no extra parsing needed
      // (the column's customType already handled deserialization)
      if (item.werkverantwoordelijkeHandtekening === undefined) {
        item.werkverantwoordelijkeHandtekening = null
      }
      if (item.schakelbevoegdeHandtekening === undefined) {
        item.schakelbevoegdeHandtekening = null
      }
      // Parse photos from JSON string
      if (typeof item.photos === 'string') {
        try {
          item.photos = JSON.parse(item.photos)
        } catch (e) {
          console.error('Error parsing photos:', e)
          item.photos = []
        }
      }
      if (item.photos === null || item.photos === undefined) {
        item.photos = []
      }
  })

  return werkvergunningens
}

export async function createKvrWerkvergunningen(data: NewKvrWerkvergunningen) {
  const db = useDB()

  const [werkvergunningen] = await (db as any)
    .insert(tables.kvrWerkvergunningens)
    .values(data)
    .returning()

  return werkvergunningen
}

export async function updateKvrWerkvergunningen(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<KvrWerkvergunningen>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.kvrWerkvergunningens.id, recordId),
    eq(tables.kvrWerkvergunningens.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.kvrWerkvergunningens.owner, userId))
  }

  const [werkvergunningen] = await (db as any)
    .update(tables.kvrWerkvergunningens)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!werkvergunningen) {
    throw createError({
      status: 404,
      statusText: 'KvrWerkvergunningen not found or unauthorized'
    })
  }

  return werkvergunningen
}

export async function deleteKvrWerkvergunningen(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.kvrWerkvergunningens.id, recordId),
    eq(tables.kvrWerkvergunningens.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.kvrWerkvergunningens.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.kvrWerkvergunningens)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'KvrWerkvergunningen not found or unauthorized'
    })
  }

  return { success: true }
}