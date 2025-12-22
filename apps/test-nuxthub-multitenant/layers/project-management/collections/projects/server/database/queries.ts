// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ProjectManagementProject, NewProjectManagementProject } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllProjectManagementProjects(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const projects = await (db as any)
    .select({
      ...tables.projectManagementProjects,
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
    .from(tables.projectManagementProjects)
    .leftJoin(ownerUser, eq(tables.projectManagementProjects.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.projectManagementProjects.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.projectManagementProjects.updatedBy, updatedByUser.id))
    .where(eq(tables.projectManagementProjects.teamId, teamId))
    .orderBy(asc(tables.projectManagementProjects.order), desc(tables.projectManagementProjects.createdAt))

  return projects
}

export async function getProjectManagementProjectsByIds(teamId: string, projectIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const projects = await (db as any)
    .select({
      ...tables.projectManagementProjects,
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
    .from(tables.projectManagementProjects)
    .leftJoin(ownerUser, eq(tables.projectManagementProjects.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.projectManagementProjects.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.projectManagementProjects.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.projectManagementProjects.teamId, teamId),
        inArray(tables.projectManagementProjects.id, projectIds)
      )
    )
    .orderBy(asc(tables.projectManagementProjects.order), desc(tables.projectManagementProjects.createdAt))

  return projects
}

export async function createProjectManagementProject(data: NewProjectManagementProject) {
  const db = useDB()

  const [project] = await (db as any)
    .insert(tables.projectManagementProjects)
    .values(data)
    .returning()

  return project
}

export async function updateProjectManagementProject(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<ProjectManagementProject>
) {
  const db = useDB()

  const [project] = await (db as any)
    .update(tables.projectManagementProjects)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.projectManagementProjects.id, recordId),
        eq(tables.projectManagementProjects.teamId, teamId),
        eq(tables.projectManagementProjects.owner, ownerId)
      )
    )
    .returning()

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ProjectManagementProject not found or unauthorized'
    })
  }

  return project
}

export async function deleteProjectManagementProject(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.projectManagementProjects)
    .where(
      and(
        eq(tables.projectManagementProjects.id, recordId),
        eq(tables.projectManagementProjects.teamId, teamId),
        eq(tables.projectManagementProjects.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ProjectManagementProject not found or unauthorized'
    })
  }

  return { success: true }
}

// Sortable reorder queries (auto-generated when sortable: true)

export async function reorderSiblingsProjectManagementProjects(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = await Promise.all(
    updates.map(({ id, order }) =>
      (db as any)
        .update(tables.projectManagementProjects)
        .set({ order })
        .where(
          and(
            eq(tables.projectManagementProjects.id, id),
            eq(tables.projectManagementProjects.teamId, teamId)
          )
        )
        .returning()
    )
  )

  return { success: true, updated: results.flat().length }
}