// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimDiscussion, NewRakimDiscussion } from '../../types'
import * as configsSchema from '../../../configs/server/database/schema'
import * as jobsSchema from '../../../jobs/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllRakimDiscussions(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const discussions = await db
    .select({
      ...tables.rakimDiscussions,
      sourceConfigIdData: configsSchema.rakimConfigs,
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
    .from(tables.rakimDiscussions)
    .leftJoin(configsSchema.rakimConfigs, eq(tables.rakimDiscussions.sourceConfigId, configsSchema.rakimConfigs.id))
    .leftJoin(jobsSchema.rakimJobs, eq(tables.rakimDiscussions.syncJobId, jobsSchema.rakimJobs.id))
    .leftJoin(ownerUser, eq(tables.rakimDiscussions.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimDiscussions.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimDiscussions.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimDiscussions.teamId, teamId))
    .orderBy(desc(tables.rakimDiscussions.createdAt))

  return discussions
}

export async function getRakimDiscussionsByIds(teamId: string, discussionIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const discussions = await db
    .select({
      ...tables.rakimDiscussions,
      sourceConfigIdData: configsSchema.rakimConfigs,
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
    .from(tables.rakimDiscussions)
    .leftJoin(configsSchema.rakimConfigs, eq(tables.rakimDiscussions.sourceConfigId, configsSchema.rakimConfigs.id))
    .leftJoin(jobsSchema.rakimJobs, eq(tables.rakimDiscussions.syncJobId, jobsSchema.rakimJobs.id))
    .leftJoin(ownerUser, eq(tables.rakimDiscussions.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimDiscussions.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimDiscussions.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimDiscussions.teamId, teamId),
        inArray(tables.rakimDiscussions.id, discussionIds)
      )
    )
    .orderBy(desc(tables.rakimDiscussions.createdAt))

  return discussions
}

export async function createRakimDiscussion(data: NewRakimDiscussion & { createdBy?: string; updatedBy?: string }) {
  const db = useDB()

  // Ensure audit fields are set (defaulting to owner if not provided)
  const insertData = {
    ...data,
    createdBy: data.createdBy || data.owner,
    updatedBy: data.updatedBy || data.owner,
  }

  const [discussion] = await db
    .insert(tables.rakimDiscussions)
    .values(insertData)
    .returning()

  return discussion
}

export async function updateRakimDiscussion(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimDiscussion>
) {
  const db = useDB()

  const [discussion] = await db
    .update(tables.rakimDiscussions)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.rakimDiscussions.id, recordId),
        eq(tables.rakimDiscussions.teamId, teamId),
        eq(tables.rakimDiscussions.owner, ownerId)
      )
    )
    .returning()

  if (!discussion) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimDiscussion not found or unauthorized'
    })
  }

  return discussion
}

export async function deleteRakimDiscussion(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.rakimDiscussions)
    .where(
      and(
        eq(tables.rakimDiscussions.id, recordId),
        eq(tables.rakimDiscussions.teamId, teamId),
        eq(tables.rakimDiscussions.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimDiscussion not found or unauthorized'
    })
  }

  return { success: true }
}