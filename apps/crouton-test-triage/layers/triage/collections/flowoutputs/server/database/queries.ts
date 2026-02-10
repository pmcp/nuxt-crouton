// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { TriageFlowOutput, NewTriageFlowOutput } from '../../types'
import * as flowsSchema from '../../../flows/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllTriageFlowOutputs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const flowOutputs = await (db as any)
    .select({
      ...tables.triageFlowOutputs,
      flowIdData: flowsSchema.triageFlows,
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
    .from(tables.triageFlowOutputs)
    .leftJoin(flowsSchema.triageFlows, eq(tables.triageFlowOutputs.flowId, flowsSchema.triageFlows.id))
    .leftJoin(ownerUser, eq(tables.triageFlowOutputs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageFlowOutputs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageFlowOutputs.updatedBy, updatedByUser.id))
    .where(eq(tables.triageFlowOutputs.teamId, teamId))
    .orderBy(desc(tables.triageFlowOutputs.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  flowoutputs.forEach((item: any) => {
      // Parse outputConfig from JSON string
      if (typeof item.outputConfig === 'string') {
        try {
          item.outputConfig = JSON.parse(item.outputConfig)
        } catch (e) {
          console.error('Error parsing outputConfig:', e)
          item.outputConfig = null
        }
      }
      if (item.outputConfig === null || item.outputConfig === undefined) {
        item.outputConfig = null
      }
  })

  return flowOutputs
}

export async function getTriageFlowOutputsByIds(teamId: string, flowOutputIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const flowOutputs = await (db as any)
    .select({
      ...tables.triageFlowOutputs,
      flowIdData: flowsSchema.triageFlows,
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
    .from(tables.triageFlowOutputs)
    .leftJoin(flowsSchema.triageFlows, eq(tables.triageFlowOutputs.flowId, flowsSchema.triageFlows.id))
    .leftJoin(ownerUser, eq(tables.triageFlowOutputs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageFlowOutputs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageFlowOutputs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.triageFlowOutputs.teamId, teamId),
        inArray(tables.triageFlowOutputs.id, flowOutputIds)
      )
    )
    .orderBy(desc(tables.triageFlowOutputs.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  flowoutputs.forEach((item: any) => {
      // Parse outputConfig from JSON string
      if (typeof item.outputConfig === 'string') {
        try {
          item.outputConfig = JSON.parse(item.outputConfig)
        } catch (e) {
          console.error('Error parsing outputConfig:', e)
          item.outputConfig = null
        }
      }
      if (item.outputConfig === null || item.outputConfig === undefined) {
        item.outputConfig = null
      }
  })

  return flowOutputs
}

export async function createTriageFlowOutput(data: NewTriageFlowOutput) {
  const db = useDB()

  const [flowOutput] = await (db as any)
    .insert(tables.triageFlowOutputs)
    .values(data)
    .returning()

  return flowOutput
}

export async function updateTriageFlowOutput(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<TriageFlowOutput>
) {
  const db = useDB()

  const [flowOutput] = await (db as any)
    .update(tables.triageFlowOutputs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.triageFlowOutputs.id, recordId),
        eq(tables.triageFlowOutputs.teamId, teamId),
        eq(tables.triageFlowOutputs.owner, ownerId)
      )
    )
    .returning()

  if (!flowOutput) {
    throw createError({
      status: 404,
      statusText: 'TriageFlowOutput not found or unauthorized'
    })
  }

  return flowOutput
}

export async function deleteTriageFlowOutput(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.triageFlowOutputs)
    .where(
      and(
        eq(tables.triageFlowOutputs.id, recordId),
        eq(tables.triageFlowOutputs.teamId, teamId),
        eq(tables.triageFlowOutputs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'TriageFlowOutput not found or unauthorized'
    })
  }

  return { success: true }
}