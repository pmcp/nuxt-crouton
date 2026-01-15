// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DiscubotJob, NewDiscubotJob } from '../../types'
import * as discussionsSchema from '../../../discussions/server/database/schema'
import * as configsSchema from '../../../configs/server/database/schema'
import { users } from '~~/server/database/schema'

export async function getAllDiscubotJobs(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const jobs = await db
    .select({
      ...tables.discubotJobs,
      discussionIdData: discussionsSchema.discubotDiscussions,
      sourceConfigIdData: configsSchema.discubotConfigs,
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
    .from(tables.discubotJobs)
    .leftJoin(discussionsSchema.discubotDiscussions, eq(tables.discubotJobs.discussionId, discussionsSchema.discubotDiscussions.id))
    .leftJoin(configsSchema.discubotConfigs, eq(tables.discubotJobs.sourceConfigId, configsSchema.discubotConfigs.id))
    .leftJoin(ownerUsers, eq(tables.discubotJobs.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotJobs.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotJobs.updatedBy, updatedByUsers.id))
    .where(eq(tables.discubotJobs.teamId, teamId))
    .orderBy(desc(tables.discubotJobs.createdAt))

  return jobs
}

export async function getDiscubotJobsByIds(teamId: string, jobIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const jobs = await db
    .select({
      ...tables.discubotJobs,
      discussionIdData: discussionsSchema.discubotDiscussions,
      sourceConfigIdData: configsSchema.discubotConfigs,
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
    .from(tables.discubotJobs)
    .leftJoin(discussionsSchema.discubotDiscussions, eq(tables.discubotJobs.discussionId, discussionsSchema.discubotDiscussions.id))
    .leftJoin(configsSchema.discubotConfigs, eq(tables.discubotJobs.sourceConfigId, configsSchema.discubotConfigs.id))
    .leftJoin(ownerUsers, eq(tables.discubotJobs.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotJobs.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotJobs.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.discubotJobs.teamId, teamId),
        inArray(tables.discubotJobs.id, jobIds)
      )
    )
    .orderBy(desc(tables.discubotJobs.createdAt))

  return jobs
}

export async function createDiscubotJob(data: NewDiscubotJob & { createdBy?: string; updatedBy?: string }) {
  const db = useDB()

  // Ensure audit fields are set (defaulting to owner if not provided)
  const insertData = {
    ...data,
    createdBy: data.createdBy || data.owner,
    updatedBy: data.updatedBy || data.owner,
  }

  const [job] = await db
    .insert(tables.discubotJobs)
    .values(insertData)
    .returning()

  return job
}

export async function updateDiscubotJob(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DiscubotJob>
) {
  const db = useDB()

  const [job] = await db
    .update(tables.discubotJobs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.discubotJobs.id, recordId),
        eq(tables.discubotJobs.teamId, teamId),
        eq(tables.discubotJobs.owner, ownerId)
      )
    )
    .returning()

  if (!job) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotJob not found or unauthorized'
    })
  }

  return job
}

export async function deleteDiscubotJob(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.discubotJobs)
    .where(
      and(
        eq(tables.discubotJobs.id, recordId),
        eq(tables.discubotJobs.teamId, teamId),
        eq(tables.discubotJobs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotJob not found or unauthorized'
    })
  }

  return { success: true }
}