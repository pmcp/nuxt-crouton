// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DiscubotFlowOutput, NewDiscubotFlowOutput } from '../../types'
import * as flowsSchema from '../../../flows/server/database/schema'
import { users } from '~~/server/database/schema'

export async function getAllDiscubotFlowOutputs(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const flowoutputs = await db
    .select({
      ...tables.discubotFlowoutputs,
      flowIdData: flowsSchema.discubotFlows,
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
    .from(tables.discubotFlowoutputs)
    .leftJoin(flowsSchema.discubotFlows, eq(tables.discubotFlowoutputs.flowId, flowsSchema.discubotFlows.id))
    .leftJoin(ownerUsers, eq(tables.discubotFlowoutputs.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotFlowoutputs.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotFlowoutputs.updatedBy, updatedByUsers.id))
    .where(eq(tables.discubotFlowoutputs.teamId, teamId))
    .orderBy(desc(tables.discubotFlowoutputs.createdAt))

  return flowoutputs
}

export async function getDiscubotFlowOutputsByIds(teamId: string, flowoutputIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const flowoutputs = await db
    .select({
      ...tables.discubotFlowoutputs,
      flowIdData: flowsSchema.discubotFlows,
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
    .from(tables.discubotFlowoutputs)
    .leftJoin(flowsSchema.discubotFlows, eq(tables.discubotFlowoutputs.flowId, flowsSchema.discubotFlows.id))
    .leftJoin(ownerUsers, eq(tables.discubotFlowoutputs.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotFlowoutputs.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotFlowoutputs.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.discubotFlowoutputs.teamId, teamId),
        inArray(tables.discubotFlowoutputs.id, flowoutputIds)
      )
    )
    .orderBy(desc(tables.discubotFlowoutputs.createdAt))

  return flowoutputs
}

export async function createDiscubotFlowOutput(data: NewDiscubotFlowOutput) {
  const db = useDB()

  const [flowoutput] = await db
    .insert(tables.discubotFlowoutputs)
    .values(data)
    .returning()

  return flowoutput
}

export async function updateDiscubotFlowOutput(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DiscubotFlowOutput>
) {
  const db = useDB()

  const [flowoutput] = await db
    .update(tables.discubotFlowoutputs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.discubotFlowoutputs.id, recordId),
        eq(tables.discubotFlowoutputs.teamId, teamId),
        eq(tables.discubotFlowoutputs.owner, ownerId)
      )
    )
    .returning()

  if (!flowoutput) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotFlowOutput not found or unauthorized'
    })
  }

  return flowoutput
}

export async function deleteDiscubotFlowOutput(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.discubotFlowoutputs)
    .where(
      and(
        eq(tables.discubotFlowoutputs.id, recordId),
        eq(tables.discubotFlowoutputs.teamId, teamId),
        eq(tables.discubotFlowoutputs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotFlowOutput not found or unauthorized'
    })
  }

  return { success: true }
}