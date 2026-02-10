// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { TriageFlowInput, NewTriageFlowInput } from '../../types'
import * as flowsSchema from '../../../flows/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllTriageFlowInputs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const flowInputs = await (db as any)
    .select({
      ...tables.triageFlowInputs,
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
    .from(tables.triageFlowInputs)
    .leftJoin(flowsSchema.triageFlows, eq(tables.triageFlowInputs.flowId, flowsSchema.triageFlows.id))
    .leftJoin(ownerUser, eq(tables.triageFlowInputs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageFlowInputs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageFlowInputs.updatedBy, updatedByUser.id))
    .where(eq(tables.triageFlowInputs.teamId, teamId))
    .orderBy(desc(tables.triageFlowInputs.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  flowinputs.forEach((item: any) => {
      // Parse sourceMetadata from JSON string
      if (typeof item.sourceMetadata === 'string') {
        try {
          item.sourceMetadata = JSON.parse(item.sourceMetadata)
        } catch (e) {
          console.error('Error parsing sourceMetadata:', e)
          item.sourceMetadata = null
        }
      }
      if (item.sourceMetadata === null || item.sourceMetadata === undefined) {
        item.sourceMetadata = null
      }
  })

  return flowInputs
}

export async function getTriageFlowInputsByIds(teamId: string, flowInputIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const flowInputs = await (db as any)
    .select({
      ...tables.triageFlowInputs,
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
    .from(tables.triageFlowInputs)
    .leftJoin(flowsSchema.triageFlows, eq(tables.triageFlowInputs.flowId, flowsSchema.triageFlows.id))
    .leftJoin(ownerUser, eq(tables.triageFlowInputs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageFlowInputs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageFlowInputs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.triageFlowInputs.teamId, teamId),
        inArray(tables.triageFlowInputs.id, flowInputIds)
      )
    )
    .orderBy(desc(tables.triageFlowInputs.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  flowinputs.forEach((item: any) => {
      // Parse sourceMetadata from JSON string
      if (typeof item.sourceMetadata === 'string') {
        try {
          item.sourceMetadata = JSON.parse(item.sourceMetadata)
        } catch (e) {
          console.error('Error parsing sourceMetadata:', e)
          item.sourceMetadata = null
        }
      }
      if (item.sourceMetadata === null || item.sourceMetadata === undefined) {
        item.sourceMetadata = null
      }
  })

  return flowInputs
}

export async function createTriageFlowInput(data: NewTriageFlowInput) {
  const db = useDB()

  const [flowInput] = await (db as any)
    .insert(tables.triageFlowInputs)
    .values(data)
    .returning()

  return flowInput
}

export async function updateTriageFlowInput(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<TriageFlowInput>
) {
  const db = useDB()

  const [flowInput] = await (db as any)
    .update(tables.triageFlowInputs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.triageFlowInputs.id, recordId),
        eq(tables.triageFlowInputs.teamId, teamId),
        eq(tables.triageFlowInputs.owner, ownerId)
      )
    )
    .returning()

  if (!flowInput) {
    throw createError({
      status: 404,
      statusText: 'TriageFlowInput not found or unauthorized'
    })
  }

  return flowInput
}

export async function deleteTriageFlowInput(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.triageFlowInputs)
    .where(
      and(
        eq(tables.triageFlowInputs.id, recordId),
        eq(tables.triageFlowInputs.teamId, teamId),
        eq(tables.triageFlowInputs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'TriageFlowInput not found or unauthorized'
    })
  }

  return { success: true }
}