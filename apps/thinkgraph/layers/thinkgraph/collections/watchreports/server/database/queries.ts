// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphWatchReport, NewThinkgraphWatchReport } from '../../types'
import * as watchedReposSchema from '../../../watchedrepos/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphWatchReports(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const watchReports = await (db as any)
    .select({
      ...tables.thinkgraphWatchReports,
      repoIdData: watchedReposSchema.thinkgraphWatchedRepos,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphWatchReports)
    .leftJoin(watchedReposSchema.thinkgraphWatchedRepos, eq(tables.thinkgraphWatchReports.repoId, watchedReposSchema.thinkgraphWatchedRepos.id))
    .leftJoin(ownerUser, eq(tables.thinkgraphWatchReports.owner, ownerUser.id))
    .where(eq(tables.thinkgraphWatchReports.teamId, teamId))

  // Post-query processing for JSON fields (repeater/json types)
  watchReports.forEach((item: any) => {
      // Parse commitsSinceLast from JSON string
      if (typeof item.commitsSinceLast === 'string') {
        try {
          item.commitsSinceLast = JSON.parse(item.commitsSinceLast)
        } catch (e) {
          console.error('Error parsing commitsSinceLast:', e)
          item.commitsSinceLast = null
        }
      }
      if (item.commitsSinceLast === null || item.commitsSinceLast === undefined) {
        item.commitsSinceLast = null
      }
      // Parse createdNodeIds from JSON string
      if (typeof item.createdNodeIds === 'string') {
        try {
          item.createdNodeIds = JSON.parse(item.createdNodeIds)
        } catch (e) {
          console.error('Error parsing createdNodeIds:', e)
          item.createdNodeIds = null
        }
      }
      if (item.createdNodeIds === null || item.createdNodeIds === undefined) {
        item.createdNodeIds = null
      }
  })

  return watchReports
}

export async function getThinkgraphWatchReportsByIds(teamId: string, watchReportIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const watchReports = await (db as any)
    .select({
      ...tables.thinkgraphWatchReports,
      repoIdData: watchedReposSchema.thinkgraphWatchedRepos,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphWatchReports)
    .leftJoin(watchedReposSchema.thinkgraphWatchedRepos, eq(tables.thinkgraphWatchReports.repoId, watchedReposSchema.thinkgraphWatchedRepos.id))
    .leftJoin(ownerUser, eq(tables.thinkgraphWatchReports.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphWatchReports.teamId, teamId),
        inArray(tables.thinkgraphWatchReports.id, watchReportIds)
      )
    )

  // Post-query processing for JSON fields (repeater/json types)
  watchReports.forEach((item: any) => {
      // Parse commitsSinceLast from JSON string
      if (typeof item.commitsSinceLast === 'string') {
        try {
          item.commitsSinceLast = JSON.parse(item.commitsSinceLast)
        } catch (e) {
          console.error('Error parsing commitsSinceLast:', e)
          item.commitsSinceLast = null
        }
      }
      if (item.commitsSinceLast === null || item.commitsSinceLast === undefined) {
        item.commitsSinceLast = null
      }
      // Parse createdNodeIds from JSON string
      if (typeof item.createdNodeIds === 'string') {
        try {
          item.createdNodeIds = JSON.parse(item.createdNodeIds)
        } catch (e) {
          console.error('Error parsing createdNodeIds:', e)
          item.createdNodeIds = null
        }
      }
      if (item.createdNodeIds === null || item.createdNodeIds === undefined) {
        item.createdNodeIds = null
      }
  })

  return watchReports
}

export async function createThinkgraphWatchReport(data: NewThinkgraphWatchReport) {
  const db = useDB()

  const [watchReport] = await (db as any)
    .insert(tables.thinkgraphWatchReports)
    .values(data)
    .returning()

  return watchReport
}

export async function updateThinkgraphWatchReport(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphWatchReport>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphWatchReports.id, recordId),
    eq(tables.thinkgraphWatchReports.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphWatchReports.owner, userId))
  }

  const [watchReport] = await (db as any)
    .update(tables.thinkgraphWatchReports)
    .set({
      ...updates,
    })
    .where(and(...conditions))
    .returning()

  if (!watchReport) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphWatchReport not found or unauthorized'
    })
  }

  return watchReport
}

export async function deleteThinkgraphWatchReport(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphWatchReports.id, recordId),
    eq(tables.thinkgraphWatchReports.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphWatchReports.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphWatchReports)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphWatchReport not found or unauthorized'
    })
  }

  return { success: true }
}