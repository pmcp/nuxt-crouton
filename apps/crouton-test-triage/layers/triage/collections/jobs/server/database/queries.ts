// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { TriageJob, NewTriageJob } from '../../types'
import * as discussionsSchema from '../../../discussions/server/database/schema'
import * as flowInputsSchema from '../../../flowinputs/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllTriageJobs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const jobs = await (db as any)
    .select({
      ...tables.triageJobs,
      discussionIdData: discussionsSchema.triageDiscussions,
      flowInputIdData: flowInputsSchema.triageFlowInputs,
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
    .from(tables.triageJobs)
    .leftJoin(discussionsSchema.triageDiscussions, eq(tables.triageJobs.discussionId, discussionsSchema.triageDiscussions.id))
    .leftJoin(flowInputsSchema.triageFlowInputs, eq(tables.triageJobs.flowInputId, flowInputsSchema.triageFlowInputs.id))
    .leftJoin(ownerUser, eq(tables.triageJobs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageJobs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageJobs.updatedBy, updatedByUser.id))
    .where(eq(tables.triageJobs.teamId, teamId))
    .orderBy(desc(tables.triageJobs.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  jobs.forEach((item: any) => {
      // Parse metadata from JSON string
      if (typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata)
        } catch (e) {
          console.error('Error parsing metadata:', e)
          item.metadata = null
        }
      }
      if (item.metadata === null || item.metadata === undefined) {
        item.metadata = null
      }
  })

  return jobs
}

export async function getTriageJobsByIds(teamId: string, jobIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const jobs = await (db as any)
    .select({
      ...tables.triageJobs,
      discussionIdData: discussionsSchema.triageDiscussions,
      flowInputIdData: flowInputsSchema.triageFlowInputs,
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
    .from(tables.triageJobs)
    .leftJoin(discussionsSchema.triageDiscussions, eq(tables.triageJobs.discussionId, discussionsSchema.triageDiscussions.id))
    .leftJoin(flowInputsSchema.triageFlowInputs, eq(tables.triageJobs.flowInputId, flowInputsSchema.triageFlowInputs.id))
    .leftJoin(ownerUser, eq(tables.triageJobs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageJobs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageJobs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.triageJobs.teamId, teamId),
        inArray(tables.triageJobs.id, jobIds)
      )
    )
    .orderBy(desc(tables.triageJobs.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  jobs.forEach((item: any) => {
      // Parse metadata from JSON string
      if (typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata)
        } catch (e) {
          console.error('Error parsing metadata:', e)
          item.metadata = null
        }
      }
      if (item.metadata === null || item.metadata === undefined) {
        item.metadata = null
      }
  })

  return jobs
}

export async function createTriageJob(data: NewTriageJob) {
  const db = useDB()

  const [job] = await (db as any)
    .insert(tables.triageJobs)
    .values(data)
    .returning()

  return job
}

export async function updateTriageJob(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<TriageJob>
) {
  const db = useDB()

  const [job] = await (db as any)
    .update(tables.triageJobs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.triageJobs.id, recordId),
        eq(tables.triageJobs.teamId, teamId),
        eq(tables.triageJobs.owner, ownerId)
      )
    )
    .returning()

  if (!job) {
    throw createError({
      status: 404,
      statusText: 'TriageJob not found or unauthorized'
    })
  }

  return job
}

export async function deleteTriageJob(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.triageJobs)
    .where(
      and(
        eq(tables.triageJobs.id, recordId),
        eq(tables.triageJobs.teamId, teamId),
        eq(tables.triageJobs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'TriageJob not found or unauthorized'
    })
  }

  return { success: true }
}