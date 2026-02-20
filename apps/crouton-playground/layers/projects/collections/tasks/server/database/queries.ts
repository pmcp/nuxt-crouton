// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ProjectsTask, NewProjectsTask } from '../../types'
import * as contactsSchema from '../../../../../people/collections/contacts/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllProjectsTasks(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const tasks = await (db as any)
    .select({
      ...tables.projectsTasks,
      assigneeIdData: contactsSchema.projectsContacts,
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
    .from(tables.projectsTasks)
    .leftJoin(contactsSchema.projectsContacts, eq(tables.projectsTasks.assigneeId, contactsSchema.projectsContacts.id))
    .leftJoin(ownerUser, eq(tables.projectsTasks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.projectsTasks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.projectsTasks.updatedBy, updatedByUser.id))
    .where(eq(tables.projectsTasks.teamId, teamId))
    .orderBy(desc(tables.projectsTasks.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  tasks.forEach((item: any) => {
      // Parse subtasks from JSON string
      if (typeof item.subtasks === 'string') {
        try {
          item.subtasks = JSON.parse(item.subtasks)
        } catch (e) {
          console.error('Error parsing subtasks:', e)
          item.subtasks = []
        }
      }
      if (item.subtasks === null || item.subtasks === undefined) {
        item.subtasks = []
      }
  })

  return tasks
}

export async function getProjectsTasksByIds(teamId: string, taskIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const tasks = await (db as any)
    .select({
      ...tables.projectsTasks,
      assigneeIdData: contactsSchema.projectsContacts,
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
    .from(tables.projectsTasks)
    .leftJoin(contactsSchema.projectsContacts, eq(tables.projectsTasks.assigneeId, contactsSchema.projectsContacts.id))
    .leftJoin(ownerUser, eq(tables.projectsTasks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.projectsTasks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.projectsTasks.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.projectsTasks.teamId, teamId),
        inArray(tables.projectsTasks.id, taskIds)
      )
    )
    .orderBy(desc(tables.projectsTasks.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  tasks.forEach((item: any) => {
      // Parse subtasks from JSON string
      if (typeof item.subtasks === 'string') {
        try {
          item.subtasks = JSON.parse(item.subtasks)
        } catch (e) {
          console.error('Error parsing subtasks:', e)
          item.subtasks = []
        }
      }
      if (item.subtasks === null || item.subtasks === undefined) {
        item.subtasks = []
      }
  })

  return tasks
}

export async function createProjectsTask(data: NewProjectsTask) {
  const db = useDB()

  const [task] = await (db as any)
    .insert(tables.projectsTasks)
    .values(data)
    .returning()

  return task
}

export async function updateProjectsTask(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<ProjectsTask>
) {
  const db = useDB()

  const [task] = await (db as any)
    .update(tables.projectsTasks)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.projectsTasks.id, recordId),
        eq(tables.projectsTasks.teamId, teamId),
        eq(tables.projectsTasks.owner, ownerId)
      )
    )
    .returning()

  if (!task) {
    throw createError({
      status: 404,
      statusText: 'ProjectsTask not found or unauthorized'
    })
  }

  return task
}

export async function deleteProjectsTask(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.projectsTasks)
    .where(
      and(
        eq(tables.projectsTasks.id, recordId),
        eq(tables.projectsTasks.teamId, teamId),
        eq(tables.projectsTasks.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ProjectsTask not found or unauthorized'
    })
  }

  return { success: true }
}