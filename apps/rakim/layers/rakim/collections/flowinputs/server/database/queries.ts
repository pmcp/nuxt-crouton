// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DiscubotFlowInput, NewDiscubotFlowInput } from '../../types'
import * as flowsSchema from '../../../flows/server/database/schema'
import { users } from '~~/server/database/schema'

export async function getAllDiscubotFlowInputs(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const flowinputs = await db
    .select({
      ...tables.discubotFlowinputs,
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
    .from(tables.discubotFlowinputs)
    .leftJoin(flowsSchema.discubotFlows, eq(tables.discubotFlowinputs.flowId, flowsSchema.discubotFlows.id))
    .leftJoin(ownerUsers, eq(tables.discubotFlowinputs.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotFlowinputs.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotFlowinputs.updatedBy, updatedByUsers.id))
    .where(eq(tables.discubotFlowinputs.teamId, teamId))
    .orderBy(desc(tables.discubotFlowinputs.createdAt))

  return flowinputs
}

export async function getDiscubotFlowInputsByIds(teamId: string, flowinputIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const flowinputs = await db
    .select({
      ...tables.discubotFlowinputs,
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
    .from(tables.discubotFlowinputs)
    .leftJoin(flowsSchema.discubotFlows, eq(tables.discubotFlowinputs.flowId, flowsSchema.discubotFlows.id))
    .leftJoin(ownerUsers, eq(tables.discubotFlowinputs.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotFlowinputs.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotFlowinputs.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.discubotFlowinputs.teamId, teamId),
        inArray(tables.discubotFlowinputs.id, flowinputIds)
      )
    )
    .orderBy(desc(tables.discubotFlowinputs.createdAt))

  return flowinputs
}

export async function createDiscubotFlowInput(data: NewDiscubotFlowInput) {
  const db = useDB()

  const [flowinput] = await db
    .insert(tables.discubotFlowinputs)
    .values(data)
    .returning()

  return flowinput
}

export async function updateDiscubotFlowInput(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DiscubotFlowInput>
) {
  const db = useDB()

  const [flowinput] = await db
    .update(tables.discubotFlowinputs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.discubotFlowinputs.id, recordId),
        eq(tables.discubotFlowinputs.teamId, teamId),
        eq(tables.discubotFlowinputs.owner, ownerId)
      )
    )
    .returning()

  if (!flowinput) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotFlowInput not found or unauthorized'
    })
  }

  return flowinput
}

export async function deleteDiscubotFlowInput(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.discubotFlowinputs)
    .where(
      and(
        eq(tables.discubotFlowinputs.id, recordId),
        eq(tables.discubotFlowinputs.teamId, teamId),
        eq(tables.discubotFlowinputs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotFlowInput not found or unauthorized'
    })
  }

  return { success: true }
}

/**
 * Find FlowInput by email address
 * Used by webhooks to route incoming emails to the correct Flow
 *
 * @param emailAddress - Full email address (e.g., "four-cases-fold@messages.friendlyinter.net")
 * @returns FlowInput with joined Flow data, or null if not found
 */
export async function findFlowInputByEmailAddress(emailAddress: string) {
  const db = useDB()

  const [result] = await db
    .select({
      ...tables.discubotFlowinputs,
      flowIdData: flowsSchema.discubotFlows,
    })
    .from(tables.discubotFlowinputs)
    .leftJoin(flowsSchema.discubotFlows, eq(tables.discubotFlowinputs.flowId, flowsSchema.discubotFlows.id))
    .where(
      and(
        eq(tables.discubotFlowinputs.emailAddress, emailAddress),
        eq(tables.discubotFlowinputs.active, true)
      )
    )
    .limit(1)

  return result || null
}