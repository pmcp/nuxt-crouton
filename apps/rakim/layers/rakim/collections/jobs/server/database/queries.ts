// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimJob, NewRakimJob } from '../../types'
import * as discussionsSchema from '../../../discussions/server/database/schema'
import * as configsSchema from '../../../configs/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllRakimJobs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const jobs = await db
    .select({
      ...tables.rakimJobs,
      discussionIdData: discussionsSchema.rakimDiscussions,
      sourceConfigIdData: configsSchema.rakimConfigs,
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
    .from(tables.rakimJobs)
    .leftJoin(discussionsSchema.rakimDiscussions, eq(tables.rakimJobs.discussionId, discussionsSchema.rakimDiscussions.id))
    .leftJoin(configsSchema.rakimConfigs, eq(tables.rakimJobs.sourceConfigId, configsSchema.rakimConfigs.id))
    .leftJoin(ownerUser, eq(tables.rakimJobs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimJobs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimJobs.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimJobs.teamId, teamId))
    .orderBy(desc(tables.rakimJobs.createdAt))

  return jobs
}

export async function getRakimJobsByIds(teamId: string, jobIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const jobs = await db
    .select({
      ...tables.rakimJobs,
      discussionIdData: discussionsSchema.rakimDiscussions,
      sourceConfigIdData: configsSchema.rakimConfigs,
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
    .from(tables.rakimJobs)
    .leftJoin(discussionsSchema.rakimDiscussions, eq(tables.rakimJobs.discussionId, discussionsSchema.rakimDiscussions.id))
    .leftJoin(configsSchema.rakimConfigs, eq(tables.rakimJobs.sourceConfigId, configsSchema.rakimConfigs.id))
    .leftJoin(ownerUser, eq(tables.rakimJobs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimJobs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimJobs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimJobs.teamId, teamId),
        inArray(tables.rakimJobs.id, jobIds)
      )
    )
    .orderBy(desc(tables.rakimJobs.createdAt))

  return jobs
}

export async function createRakimJob(data: NewRakimJob & { createdBy?: string; updatedBy?: string }) {
  const db = useDB()

  // Ensure audit fields are set (defaulting to owner if not provided)
  const insertData = {
    ...data,
    createdBy: data.createdBy || data.owner,
    updatedBy: data.updatedBy || data.owner,
  }

  const [job] = await db
    .insert(tables.rakimJobs)
    .values(insertData)
    .returning()

  return job
}

export async function updateRakimJob(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimJob>
) {
  const db = useDB()

  const [job] = await db
    .update(tables.rakimJobs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.rakimJobs.id, recordId),
        eq(tables.rakimJobs.teamId, teamId),
        eq(tables.rakimJobs.owner, ownerId)
      )
    )
    .returning()

  if (!job) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimJob not found or unauthorized'
    })
  }

  return job
}

export async function deleteRakimJob(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.rakimJobs)
    .where(
      and(
        eq(tables.rakimJobs.id, recordId),
        eq(tables.rakimJobs.teamId, teamId),
        eq(tables.rakimJobs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimJob not found or unauthorized'
    })
  }

  return { success: true }
}