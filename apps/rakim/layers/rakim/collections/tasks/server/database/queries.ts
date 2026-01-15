// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimTask, NewRakimTask } from '../../types'
import * as discussionsSchema from '../../../discussions/server/database/schema'
import * as jobsSchema from '../../../jobs/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllRakimTasks(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const tasks = await db
    .select({
      ...tables.rakimTasks,
      discussionIdData: discussionsSchema.rakimDiscussions,
      syncJobIdData: jobsSchema.rakimJobs,
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
    })
    .from(tables.rakimTasks)
    .leftJoin(discussionsSchema.rakimDiscussions, eq(tables.rakimTasks.discussionId, discussionsSchema.rakimDiscussions.id))
    .leftJoin(jobsSchema.rakimJobs, eq(tables.rakimTasks.syncJobId, jobsSchema.rakimJobs.id))
    .leftJoin(ownerUser, eq(tables.rakimTasks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimTasks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimTasks.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimTasks.teamId, teamId))
    .orderBy(desc(tables.rakimTasks.createdAt))

  return tasks
}

export async function getRakimTasksByIds(teamId: string, taskIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const tasks = await db
    .select({
      ...tables.rakimTasks,
      discussionIdData: discussionsSchema.rakimDiscussions,
      syncJobIdData: jobsSchema.rakimJobs,
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
    })
    .from(tables.rakimTasks)
    .leftJoin(discussionsSchema.rakimDiscussions, eq(tables.rakimTasks.discussionId, discussionsSchema.rakimDiscussions.id))
    .leftJoin(jobsSchema.rakimJobs, eq(tables.rakimTasks.syncJobId, jobsSchema.rakimJobs.id))
    .leftJoin(ownerUser, eq(tables.rakimTasks.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimTasks.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimTasks.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimTasks.teamId, teamId),
        inArray(tables.rakimTasks.id, taskIds)
      )
    )
    .orderBy(desc(tables.rakimTasks.createdAt))

  return tasks
}

export async function createRakimTask(data: NewRakimTask) {
  const db = useDB()

  const [task] = await db
    .insert(tables.rakimTasks)
    .values(data)
    .returning()

  return task
}

export async function updateRakimTask(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimTask>
) {
  const db = useDB()

  const [task] = await db
    .update(tables.rakimTasks)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.rakimTasks.id, recordId),
        eq(tables.rakimTasks.teamId, teamId),
        eq(tables.rakimTasks.owner, ownerId)
      )
    )
    .returning()

  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimTask not found or unauthorized'
    })
  }

  return task
}

export async function deleteRakimTask(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.rakimTasks)
    .where(
      and(
        eq(tables.rakimTasks.id, recordId),
        eq(tables.rakimTasks.teamId, teamId),
        eq(tables.rakimTasks.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimTask not found or unauthorized'
    })
  }

  return { success: true }
}