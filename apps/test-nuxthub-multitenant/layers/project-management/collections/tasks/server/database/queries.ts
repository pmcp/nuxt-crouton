// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ProjectManagementTask, NewProjectManagementTask } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllProjectManagementTasks(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const tasks = await (db as any)
    .select({
      ...tables.projectManagementTasks,
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
    .from(tables.projectManagementTasks)
    .leftJoin(ownerUser, eq(tables.projectManagementTasks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.projectManagementTasks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.projectManagementTasks.updatedBy, updatedByUser.id))
    .where(eq(tables.projectManagementTasks.teamId, teamId))
    .orderBy(asc(tables.projectManagementTasks.order), desc(tables.projectManagementTasks.createdAt))

  return tasks
}

export async function getProjectManagementTasksByIds(teamId: string, taskIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const tasks = await (db as any)
    .select({
      ...tables.projectManagementTasks,
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
    .from(tables.projectManagementTasks)
    .leftJoin(ownerUser, eq(tables.projectManagementTasks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.projectManagementTasks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.projectManagementTasks.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.projectManagementTasks.teamId, teamId),
        inArray(tables.projectManagementTasks.id, taskIds)
      )
    )
    .orderBy(asc(tables.projectManagementTasks.order), desc(tables.projectManagementTasks.createdAt))

  return tasks
}

export async function createProjectManagementTask(data: NewProjectManagementTask) {
  const db = useDB()

  const [task] = await (db as any)
    .insert(tables.projectManagementTasks)
    .values(data)
    .returning()

  return task
}

export async function updateProjectManagementTask(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<ProjectManagementTask>
) {
  const db = useDB()

  const [task] = await (db as any)
    .update(tables.projectManagementTasks)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.projectManagementTasks.id, recordId),
        eq(tables.projectManagementTasks.teamId, teamId),
        eq(tables.projectManagementTasks.owner, ownerId)
      )
    )
    .returning()

  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ProjectManagementTask not found or unauthorized'
    })
  }

  return task
}

export async function deleteProjectManagementTask(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.projectManagementTasks)
    .where(
      and(
        eq(tables.projectManagementTasks.id, recordId),
        eq(tables.projectManagementTasks.teamId, teamId),
        eq(tables.projectManagementTasks.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ProjectManagementTask not found or unauthorized'
    })
  }

  return { success: true }
}

// Sortable reorder queries (auto-generated when sortable: true)

export async function reorderSiblingsProjectManagementTasks(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = await Promise.all(
    updates.map(({ id, order }) =>
      (db as any)
        .update(tables.projectManagementTasks)
        .set({ order })
        .where(
          and(
            eq(tables.projectManagementTasks.id, id),
            eq(tables.projectManagementTasks.teamId, teamId)
          )
        )
        .returning()
    )
  )

  return { success: true, updated: results.flat().length }
}