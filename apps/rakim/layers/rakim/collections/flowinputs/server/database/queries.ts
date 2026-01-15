// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimFlowInput, NewRakimFlowInput } from '../../types'
import * as flowsSchema from '../../../flows/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllRakimFlowInputs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const flowinputs = await db
    .select({
      ...tables.rakimFlowinputs,
      flowIdData: flowsSchema.rakimFlows,
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
    .from(tables.rakimFlowinputs)
    .leftJoin(flowsSchema.rakimFlows, eq(tables.rakimFlowinputs.flowId, flowsSchema.rakimFlows.id))
    .leftJoin(ownerUser, eq(tables.rakimFlowinputs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimFlowinputs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimFlowinputs.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimFlowinputs.teamId, teamId))
    .orderBy(desc(tables.rakimFlowinputs.createdAt))

  return flowinputs
}

export async function getRakimFlowInputsByIds(teamId: string, flowinputIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const flowinputs = await db
    .select({
      ...tables.rakimFlowinputs,
      flowIdData: flowsSchema.rakimFlows,
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
    .from(tables.rakimFlowinputs)
    .leftJoin(flowsSchema.rakimFlows, eq(tables.rakimFlowinputs.flowId, flowsSchema.rakimFlows.id))
    .leftJoin(ownerUser, eq(tables.rakimFlowinputs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimFlowinputs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimFlowinputs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimFlowinputs.teamId, teamId),
        inArray(tables.rakimFlowinputs.id, flowinputIds)
      )
    )
    .orderBy(desc(tables.rakimFlowinputs.createdAt))

  return flowinputs
}

export async function createRakimFlowInput(data: NewRakimFlowInput) {
  const db = useDB()

  const [flowinput] = await db
    .insert(tables.rakimFlowinputs)
    .values(data)
    .returning()

  return flowinput
}

export async function updateRakimFlowInput(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimFlowInput>
) {
  const db = useDB()

  const [flowinput] = await db
    .update(tables.rakimFlowinputs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.rakimFlowinputs.id, recordId),
        eq(tables.rakimFlowinputs.teamId, teamId),
        eq(tables.rakimFlowinputs.owner, ownerId)
      )
    )
    .returning()

  if (!flowinput) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimFlowInput not found or unauthorized'
    })
  }

  return flowinput
}

export async function deleteRakimFlowInput(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.rakimFlowinputs)
    .where(
      and(
        eq(tables.rakimFlowinputs.id, recordId),
        eq(tables.rakimFlowinputs.teamId, teamId),
        eq(tables.rakimFlowinputs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimFlowInput not found or unauthorized'
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
      ...tables.rakimFlowinputs,
      flowIdData: flowsSchema.rakimFlows,
    })
    .from(tables.rakimFlowinputs)
    .leftJoin(flowsSchema.rakimFlows, eq(tables.rakimFlowinputs.flowId, flowsSchema.rakimFlows.id))
    .where(
      and(
        eq(tables.rakimFlowinputs.emailAddress, emailAddress),
        eq(tables.rakimFlowinputs.active, true)
      )
    )
    .limit(1)

  return result || null
}