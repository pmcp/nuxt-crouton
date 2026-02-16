// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DesignerField, NewDesignerField } from '../../types'
import * as collectionsSchema from '../../../collections/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllDesignerFields(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const fields = await (db as any)
    .select({
      ...tables.designerFields,
      collectionIdData: collectionsSchema.designerCollections,
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
    .from(tables.designerFields)
    .leftJoin(collectionsSchema.designerCollections, eq(tables.designerFields.collectionId, collectionsSchema.designerCollections.id))
    .leftJoin(ownerUser, eq(tables.designerFields.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.designerFields.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.designerFields.updatedBy, updatedByUser.id))
    .where(eq(tables.designerFields.teamId, teamId))
    .orderBy(desc(tables.designerFields.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  fields.forEach((item: any) => {
      // Parse meta from JSON string
      if (typeof item.meta === 'string') {
        try {
          item.meta = JSON.parse(item.meta)
        } catch (e) {
          console.error('Error parsing meta:', e)
          item.meta = null
        }
      }
      if (item.meta === null || item.meta === undefined) {
        item.meta = null
      }
  })

  return fields
}

export async function getDesignerFieldsByIds(teamId: string, fieldIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const fields = await (db as any)
    .select({
      ...tables.designerFields,
      collectionIdData: collectionsSchema.designerCollections,
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
    .from(tables.designerFields)
    .leftJoin(collectionsSchema.designerCollections, eq(tables.designerFields.collectionId, collectionsSchema.designerCollections.id))
    .leftJoin(ownerUser, eq(tables.designerFields.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.designerFields.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.designerFields.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.designerFields.teamId, teamId),
        inArray(tables.designerFields.id, fieldIds)
      )
    )
    .orderBy(desc(tables.designerFields.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  fields.forEach((item: any) => {
      // Parse meta from JSON string
      if (typeof item.meta === 'string') {
        try {
          item.meta = JSON.parse(item.meta)
        } catch (e) {
          console.error('Error parsing meta:', e)
          item.meta = null
        }
      }
      if (item.meta === null || item.meta === undefined) {
        item.meta = null
      }
  })

  return fields
}

export async function createDesignerField(data: NewDesignerField) {
  const db = useDB()

  const [field] = await (db as any)
    .insert(tables.designerFields)
    .values(data)
    .returning()

  return field
}

export async function updateDesignerField(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DesignerField>
) {
  const db = useDB()

  const [field] = await (db as any)
    .update(tables.designerFields)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.designerFields.id, recordId),
        eq(tables.designerFields.teamId, teamId),
        eq(tables.designerFields.owner, ownerId)
      )
    )
    .returning()

  if (!field) {
    throw createError({
      status: 404,
      statusText: 'DesignerField not found or unauthorized'
    })
  }

  return field
}

export async function deleteDesignerField(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.designerFields)
    .where(
      and(
        eq(tables.designerFields.id, recordId),
        eq(tables.designerFields.teamId, teamId),
        eq(tables.designerFields.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'DesignerField not found or unauthorized'
    })
  }

  return { success: true }
}