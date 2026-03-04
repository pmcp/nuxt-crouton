// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DesignerProject, NewDesignerProject } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllDesignerProjects(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const projects = await (db as any)
    .select({
      ...tables.designerProjects,
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
    .from(tables.designerProjects)
    .leftJoin(ownerUser, eq(tables.designerProjects.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.designerProjects.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.designerProjects.updatedBy, updatedByUser.id))
    .where(eq(tables.designerProjects.teamId, teamId))
    .orderBy(desc(tables.designerProjects.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  projects.forEach((item: any) => {
      // Parse config from JSON string
      if (typeof item.config === 'string') {
        try {
          item.config = JSON.parse(item.config)
        } catch (e) {
          console.error('Error parsing config:', e)
          item.config = null
        }
      }
      if (item.config === null || item.config === undefined) {
        item.config = null
      }
      // Parse messages from JSON string
      if (typeof item.messages === 'string') {
        try {
          item.messages = JSON.parse(item.messages)
        } catch (e) {
          console.error('Error parsing messages:', e)
          item.messages = null
        }
      }
      if (item.messages === null || item.messages === undefined) {
        item.messages = null
      }
  })

  return projects
}

export async function getDesignerProjectsByIds(teamId: string, projectIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const projects = await (db as any)
    .select({
      ...tables.designerProjects,
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
    .from(tables.designerProjects)
    .leftJoin(ownerUser, eq(tables.designerProjects.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.designerProjects.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.designerProjects.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.designerProjects.teamId, teamId),
        inArray(tables.designerProjects.id, projectIds)
      )
    )
    .orderBy(desc(tables.designerProjects.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  projects.forEach((item: any) => {
      // Parse config from JSON string
      if (typeof item.config === 'string') {
        try {
          item.config = JSON.parse(item.config)
        } catch (e) {
          console.error('Error parsing config:', e)
          item.config = null
        }
      }
      if (item.config === null || item.config === undefined) {
        item.config = null
      }
      // Parse messages from JSON string
      if (typeof item.messages === 'string') {
        try {
          item.messages = JSON.parse(item.messages)
        } catch (e) {
          console.error('Error parsing messages:', e)
          item.messages = null
        }
      }
      if (item.messages === null || item.messages === undefined) {
        item.messages = null
      }
  })

  return projects
}

export async function createDesignerProject(data: NewDesignerProject) {
  const db = useDB()

  const [project] = await (db as any)
    .insert(tables.designerProjects)
    .values(data)
    .returning()

  return project
}

export async function updateDesignerProject(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DesignerProject>
) {
  const db = useDB()

  const [project] = await (db as any)
    .update(tables.designerProjects)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.designerProjects.id, recordId),
        eq(tables.designerProjects.teamId, teamId),
        eq(tables.designerProjects.owner, ownerId)
      )
    )
    .returning()

  if (!project) {
    throw createError({
      status: 404,
      statusText: 'DesignerProject not found or unauthorized'
    })
  }

  return project
}

export async function deleteDesignerProject(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.designerProjects)
    .where(
      and(
        eq(tables.designerProjects.id, recordId),
        eq(tables.designerProjects.teamId, teamId),
        eq(tables.designerProjects.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'DesignerProject not found or unauthorized'
    })
  }

  return { success: true }
}