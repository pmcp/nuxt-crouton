// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphWatchedRepo, NewThinkgraphWatchedRepo } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphWatchedRepos(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const watchedRepos = await (db as any)
    .select({
      ...tables.thinkgraphWatchedRepos,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphWatchedRepos)
    .leftJoin(ownerUser, eq(tables.thinkgraphWatchedRepos.owner, ownerUser.id))
    .where(eq(tables.thinkgraphWatchedRepos.teamId, teamId))

  return watchedRepos
}

export async function getThinkgraphWatchedReposByIds(teamId: string, watchedRepoIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const watchedRepos = await (db as any)
    .select({
      ...tables.thinkgraphWatchedRepos,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphWatchedRepos)
    .leftJoin(ownerUser, eq(tables.thinkgraphWatchedRepos.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphWatchedRepos.teamId, teamId),
        inArray(tables.thinkgraphWatchedRepos.id, watchedRepoIds)
      )
    )

  return watchedRepos
}

export async function createThinkgraphWatchedRepo(data: NewThinkgraphWatchedRepo) {
  const db = useDB()

  const [watchedRepo] = await (db as any)
    .insert(tables.thinkgraphWatchedRepos)
    .values(data)
    .returning()

  return watchedRepo
}

export async function updateThinkgraphWatchedRepo(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphWatchedRepo>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphWatchedRepos.id, recordId),
    eq(tables.thinkgraphWatchedRepos.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphWatchedRepos.owner, userId))
  }

  const [watchedRepo] = await (db as any)
    .update(tables.thinkgraphWatchedRepos)
    .set({
      ...updates,
    })
    .where(and(...conditions))
    .returning()

  if (!watchedRepo) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphWatchedRepo not found or unauthorized'
    })
  }

  return watchedRepo
}

export async function deleteThinkgraphWatchedRepo(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphWatchedRepos.id, recordId),
    eq(tables.thinkgraphWatchedRepos.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphWatchedRepos.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphWatchedRepos)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphWatchedRepo not found or unauthorized'
    })
  }

  return { success: true }
}