// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimFlowOutput, NewRakimFlowOutput } from '../../types'
import * as flowsSchema from '../../../flows/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllRakimFlowOutputs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const flowoutputs = await db
    .select({
      ...tables.rakimFlowoutputs,
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
    .from(tables.rakimFlowoutputs)
    .leftJoin(flowsSchema.rakimFlows, eq(tables.rakimFlowoutputs.flowId, flowsSchema.rakimFlows.id))
    .leftJoin(ownerUser, eq(tables.rakimFlowoutputs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimFlowoutputs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimFlowoutputs.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimFlowoutputs.teamId, teamId))
    .orderBy(desc(tables.rakimFlowoutputs.createdAt))

  return flowoutputs
}

export async function getRakimFlowOutputsByIds(teamId: string, flowoutputIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const flowoutputs = await db
    .select({
      ...tables.rakimFlowoutputs,
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
    .from(tables.rakimFlowoutputs)
    .leftJoin(flowsSchema.rakimFlows, eq(tables.rakimFlowoutputs.flowId, flowsSchema.rakimFlows.id))
    .leftJoin(ownerUser, eq(tables.rakimFlowoutputs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimFlowoutputs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimFlowoutputs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimFlowoutputs.teamId, teamId),
        inArray(tables.rakimFlowoutputs.id, flowoutputIds)
      )
    )
    .orderBy(desc(tables.rakimFlowoutputs.createdAt))

  return flowoutputs
}

export async function createRakimFlowOutput(data: NewRakimFlowOutput) {
  const db = useDB()

  const [flowoutput] = await db
    .insert(tables.rakimFlowoutputs)
    .values(data)
    .returning()

  return flowoutput
}

export async function updateRakimFlowOutput(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimFlowOutput>
) {
  const db = useDB()

  const [flowoutput] = await db
    .update(tables.rakimFlowoutputs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.rakimFlowoutputs.id, recordId),
        eq(tables.rakimFlowoutputs.teamId, teamId),
        eq(tables.rakimFlowoutputs.owner, ownerId)
      )
    )
    .returning()

  if (!flowoutput) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimFlowOutput not found or unauthorized'
    })
  }

  return flowoutput
}

export async function deleteRakimFlowOutput(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.rakimFlowoutputs)
    .where(
      and(
        eq(tables.rakimFlowoutputs.id, recordId),
        eq(tables.rakimFlowoutputs.teamId, teamId),
        eq(tables.rakimFlowoutputs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimFlowOutput not found or unauthorized'
    })
  }

  return { success: true }
}