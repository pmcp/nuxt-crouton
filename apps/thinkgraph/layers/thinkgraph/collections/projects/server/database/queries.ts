// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphProject, NewThinkgraphProject } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphProjects(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const projects = await (db as any)
    .select({
      ...tables.thinkgraphProjects,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphProjects)
    .leftJoin(ownerUser, eq(tables.thinkgraphProjects.owner, ownerUser.id))
    .where(eq(tables.thinkgraphProjects.teamId, teamId))
    .orderBy(desc(tables.thinkgraphProjects.order))

  return projects
}

export async function getThinkgraphProjectsByIds(teamId: string, projectIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const projects = await (db as any)
    .select({
      ...tables.thinkgraphProjects,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphProjects)
    .leftJoin(ownerUser, eq(tables.thinkgraphProjects.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphProjects.teamId, teamId),
        inArray(tables.thinkgraphProjects.id, projectIds)
      )
    )
    .orderBy(desc(tables.thinkgraphProjects.order))

  return projects
}

export async function createThinkgraphProject(data: NewThinkgraphProject) {
  const db = useDB()

  const [project] = await (db as any)
    .insert(tables.thinkgraphProjects)
    .values(data)
    .returning()

  return project
}

export async function updateThinkgraphProject(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphProject>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphProjects.id, recordId),
    eq(tables.thinkgraphProjects.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphProjects.owner, userId))
  }

  const [project] = await (db as any)
    .update(tables.thinkgraphProjects)
    .set({
      ...updates,
      // updatedBy: userId  // No metadata columns
    })
    .where(and(...conditions))
    .returning()

  if (!project) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphProject not found or unauthorized'
    })
  }

  return project
}

export async function deleteThinkgraphProject(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphProjects.id, recordId),
    eq(tables.thinkgraphProjects.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphProjects.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphProjects)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphProject not found or unauthorized'
    })
  }

  return { success: true }
}