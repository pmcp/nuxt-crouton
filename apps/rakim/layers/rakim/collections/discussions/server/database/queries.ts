// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DiscubotDiscussion, NewDiscubotDiscussion } from '../../types'
import * as configsSchema from '../../../configs/server/database/schema'
import * as jobsSchema from '../../../jobs/server/database/schema'
import { users } from '~~/server/database/schema'

export async function getAllDiscubotDiscussions(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const discussions = await db
    .select({
      ...tables.discubotDiscussions,
      sourceConfigIdData: configsSchema.discubotConfigs,
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
    .from(tables.discubotDiscussions)
    .leftJoin(configsSchema.discubotConfigs, eq(tables.discubotDiscussions.sourceConfigId, configsSchema.discubotConfigs.id))
    .leftJoin(jobsSchema.discubotJobs, eq(tables.discubotDiscussions.syncJobId, jobsSchema.discubotJobs.id))
    .leftJoin(ownerUsers, eq(tables.discubotDiscussions.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotDiscussions.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotDiscussions.updatedBy, updatedByUsers.id))
    .where(eq(tables.discubotDiscussions.teamId, teamId))
    .orderBy(desc(tables.discubotDiscussions.createdAt))

  return discussions
}

export async function getDiscubotDiscussionsByIds(teamId: string, discussionIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const discussions = await db
    .select({
      ...tables.discubotDiscussions,
      sourceConfigIdData: configsSchema.discubotConfigs,
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
    .from(tables.discubotDiscussions)
    .leftJoin(configsSchema.discubotConfigs, eq(tables.discubotDiscussions.sourceConfigId, configsSchema.discubotConfigs.id))
    .leftJoin(jobsSchema.discubotJobs, eq(tables.discubotDiscussions.syncJobId, jobsSchema.discubotJobs.id))
    .leftJoin(ownerUsers, eq(tables.discubotDiscussions.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotDiscussions.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotDiscussions.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.discubotDiscussions.teamId, teamId),
        inArray(tables.discubotDiscussions.id, discussionIds)
      )
    )
    .orderBy(desc(tables.discubotDiscussions.createdAt))

  return discussions
}

export async function createDiscubotDiscussion(data: NewDiscubotDiscussion & { createdBy?: string; updatedBy?: string }) {
  const db = useDB()

  // Ensure audit fields are set (defaulting to owner if not provided)
  const insertData = {
    ...data,
    createdBy: data.createdBy || data.owner,
    updatedBy: data.updatedBy || data.owner,
  }

  const [discussion] = await db
    .insert(tables.discubotDiscussions)
    .values(insertData)
    .returning()

  return discussion
}

export async function updateDiscubotDiscussion(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DiscubotDiscussion>
) {
  const db = useDB()

  const [discussion] = await db
    .update(tables.discubotDiscussions)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.discubotDiscussions.id, recordId),
        eq(tables.discubotDiscussions.teamId, teamId),
        eq(tables.discubotDiscussions.owner, ownerId)
      )
    )
    .returning()

  if (!discussion) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotDiscussion not found or unauthorized'
    })
  }

  return discussion
}

export async function deleteDiscubotDiscussion(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.discubotDiscussions)
    .where(
      and(
        eq(tables.discubotDiscussions.id, recordId),
        eq(tables.discubotDiscussions.teamId, teamId),
        eq(tables.discubotDiscussions.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotDiscussion not found or unauthorized'
    })
  }

  return { success: true }
}