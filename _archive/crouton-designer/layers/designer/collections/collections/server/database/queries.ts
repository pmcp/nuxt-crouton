// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DesignerCollection, NewDesignerCollection } from '../../types'
import * as projectsSchema from '../../../projects/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllDesignerCollections(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const collections = await (db as any)
    .select({
      ...tables.designerCollections,
      projectIdData: projectsSchema.designerProjects,
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
    .from(tables.designerCollections)
    .leftJoin(projectsSchema.designerProjects, eq(tables.designerCollections.projectId, projectsSchema.designerProjects.id))
    .leftJoin(ownerUser, eq(tables.designerCollections.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.designerCollections.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.designerCollections.updatedBy, updatedByUser.id))
    .where(eq(tables.designerCollections.teamId, teamId))
    .orderBy(desc(tables.designerCollections.createdAt))

  return collections
}

export async function getDesignerCollectionsByIds(teamId: string, collectionIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const collections = await (db as any)
    .select({
      ...tables.designerCollections,
      projectIdData: projectsSchema.designerProjects,
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
    .from(tables.designerCollections)
    .leftJoin(projectsSchema.designerProjects, eq(tables.designerCollections.projectId, projectsSchema.designerProjects.id))
    .leftJoin(ownerUser, eq(tables.designerCollections.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.designerCollections.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.designerCollections.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.designerCollections.teamId, teamId),
        inArray(tables.designerCollections.id, collectionIds)
      )
    )
    .orderBy(desc(tables.designerCollections.createdAt))

  return collections
}

export async function createDesignerCollection(data: NewDesignerCollection) {
  const db = useDB()

  const [collection] = await (db as any)
    .insert(tables.designerCollections)
    .values(data)
    .returning()

  return collection
}

export async function updateDesignerCollection(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DesignerCollection>
) {
  const db = useDB()

  const [collection] = await (db as any)
    .update(tables.designerCollections)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.designerCollections.id, recordId),
        eq(tables.designerCollections.teamId, teamId),
        eq(tables.designerCollections.owner, ownerId)
      )
    )
    .returning()

  if (!collection) {
    throw createError({
      status: 404,
      statusText: 'DesignerCollection not found or unauthorized'
    })
  }

  return collection
}

export async function deleteDesignerCollection(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.designerCollections)
    .where(
      and(
        eq(tables.designerCollections.id, recordId),
        eq(tables.designerCollections.teamId, teamId),
        eq(tables.designerCollections.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'DesignerCollection not found or unauthorized'
    })
  }

  return { success: true }
}