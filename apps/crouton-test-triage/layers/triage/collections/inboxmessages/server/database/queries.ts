// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { TriageInboxMessage, NewTriageInboxMessage } from '../../types'
import * as flowInputsSchema from '../../../flowinputs/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllTriageInboxMessages(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const inboxMessages = await (db as any)
    .select({
      ...tables.triageInboxMessages,
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
    .from(tables.triageInboxMessages)
    .leftJoin(flowInputsSchema.triageFlowInputs, eq(tables.triageInboxMessages.flowInputId, flowInputsSchema.triageFlowInputs.id))
    .leftJoin(ownerUser, eq(tables.triageInboxMessages.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageInboxMessages.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageInboxMessages.updatedBy, updatedByUser.id))
    .where(eq(tables.triageInboxMessages.teamId, teamId))
    .orderBy(desc(tables.triageInboxMessages.createdAt))

  return inboxMessages
}

export async function getTriageInboxMessagesByIds(teamId: string, inboxMessageIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const inboxMessages = await (db as any)
    .select({
      ...tables.triageInboxMessages,
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
    .from(tables.triageInboxMessages)
    .leftJoin(flowInputsSchema.triageFlowInputs, eq(tables.triageInboxMessages.flowInputId, flowInputsSchema.triageFlowInputs.id))
    .leftJoin(ownerUser, eq(tables.triageInboxMessages.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageInboxMessages.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageInboxMessages.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.triageInboxMessages.teamId, teamId),
        inArray(tables.triageInboxMessages.id, inboxMessageIds)
      )
    )
    .orderBy(desc(tables.triageInboxMessages.createdAt))

  return inboxMessages
}

export async function createTriageInboxMessage(data: NewTriageInboxMessage) {
  const db = useDB()

  const [inboxMessage] = await (db as any)
    .insert(tables.triageInboxMessages)
    .values(data)
    .returning()

  return inboxMessage
}

export async function updateTriageInboxMessage(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<TriageInboxMessage>
) {
  const db = useDB()

  const [inboxMessage] = await (db as any)
    .update(tables.triageInboxMessages)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.triageInboxMessages.id, recordId),
        eq(tables.triageInboxMessages.teamId, teamId),
        eq(tables.triageInboxMessages.owner, ownerId)
      )
    )
    .returning()

  if (!inboxMessage) {
    throw createError({
      status: 404,
      statusText: 'TriageInboxMessage not found or unauthorized'
    })
  }

  return inboxMessage
}

export async function deleteTriageInboxMessage(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.triageInboxMessages)
    .where(
      and(
        eq(tables.triageInboxMessages.id, recordId),
        eq(tables.triageInboxMessages.teamId, teamId),
        eq(tables.triageInboxMessages.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'TriageInboxMessage not found or unauthorized'
    })
  }

  return { success: true }
}