// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DiscubotTask, NewDiscubotTask } from '../../types'
import * as discussionsSchema from '../../../discussions/server/database/schema'
import * as jobsSchema from '../../../jobs/server/database/schema'
import { users } from '~~/server/database/schema'

export async function getAllDiscubotTasks(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const tasks = await db
    .select({
      ...tables.discubotTasks,
      discussionIdData: discussionsSchema.discubotDiscussions,
      syncJobIdData: jobsSchema.discubotJobs,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl
      }
    })
    .from(tables.discubotTasks)
    .leftJoin(discussionsSchema.discubotDiscussions, eq(tables.discubotTasks.discussionId, discussionsSchema.discubotDiscussions.id))
    .leftJoin(jobsSchema.discubotJobs, eq(tables.discubotTasks.syncJobId, jobsSchema.discubotJobs.id))
    .leftJoin(ownerUsers, eq(tables.discubotTasks.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotTasks.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotTasks.updatedBy, updatedByUsers.id))
    .where(eq(tables.discubotTasks.teamId, teamId))
    .orderBy(desc(tables.discubotTasks.createdAt))

  return tasks
}

export async function getDiscubotTasksByIds(teamId: string, taskIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const tasks = await db
    .select({
      ...tables.discubotTasks,
      discussionIdData: discussionsSchema.discubotDiscussions,
      syncJobIdData: jobsSchema.discubotJobs,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl
      }
    })
    .from(tables.discubotTasks)
    .leftJoin(discussionsSchema.discubotDiscussions, eq(tables.discubotTasks.discussionId, discussionsSchema.discubotDiscussions.id))
    .leftJoin(jobsSchema.discubotJobs, eq(tables.discubotTasks.syncJobId, jobsSchema.discubotJobs.id))
    .leftJoin(ownerUsers, eq(tables.discubotTasks.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotTasks.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotTasks.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.discubotTasks.teamId, teamId),
        inArray(tables.discubotTasks.id, taskIds)
      )
    )
    .orderBy(desc(tables.discubotTasks.createdAt))

  return tasks
}

export async function createDiscubotTask(data: NewDiscubotTask) {
  const db = useDB()

  const [task] = await db
    .insert(tables.discubotTasks)
    .values(data)
    .returning()

  return task
}

export async function updateDiscubotTask(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DiscubotTask>
) {
  const db = useDB()

  const [task] = await db
    .update(tables.discubotTasks)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.discubotTasks.id, recordId),
        eq(tables.discubotTasks.teamId, teamId),
        eq(tables.discubotTasks.owner, ownerId)
      )
    )
    .returning()

  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotTask not found or unauthorized'
    })
  }

  return task
}

export async function deleteDiscubotTask(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.discubotTasks)
    .where(
      and(
        eq(tables.discubotTasks.id, recordId),
        eq(tables.discubotTasks.teamId, teamId),
        eq(tables.discubotTasks.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotTask not found or unauthorized'
    })
  }

  return { success: true }
}