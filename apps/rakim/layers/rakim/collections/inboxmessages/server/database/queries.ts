// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimInboxMessage, NewRakimInboxMessage } from '../../types'
import * as configsSchema from '../../../configs/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllRakimInboxMessages(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const inboxmessages = await db
    .select({
      ...tables.rakimInboxmessages,
      configIdData: configsSchema.rakimConfigs,
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
    .from(tables.rakimInboxmessages)
    .leftJoin(configsSchema.rakimConfigs, eq(tables.rakimInboxmessages.configId, configsSchema.rakimConfigs.id))
    .leftJoin(ownerUser, eq(tables.rakimInboxmessages.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimInboxmessages.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimInboxmessages.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimInboxmessages.teamId, teamId))
    .orderBy(desc(tables.rakimInboxmessages.createdAt))

  return inboxmessages
}

export async function getRakimInboxMessagesByIds(teamId: string, inboxmessageIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const inboxmessages = await db
    .select({
      ...tables.rakimInboxmessages,
      configIdData: configsSchema.rakimConfigs,
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
    .from(tables.rakimInboxmessages)
    .leftJoin(configsSchema.rakimConfigs, eq(tables.rakimInboxmessages.configId, configsSchema.rakimConfigs.id))
    .leftJoin(ownerUser, eq(tables.rakimInboxmessages.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimInboxmessages.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimInboxmessages.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimInboxmessages.teamId, teamId),
        inArray(tables.rakimInboxmessages.id, inboxmessageIds)
      )
    )
    .orderBy(desc(tables.rakimInboxmessages.createdAt))

  return inboxmessages
}

export async function createRakimInboxMessage(data: NewRakimInboxMessage) {
  const db = useDB()

  const [inboxmessage] = await db
    .insert(tables.rakimInboxmessages)
    .values(data)
    .returning()

  return inboxmessage
}

export async function updateRakimInboxMessage(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimInboxMessage>
) {
  const db = useDB()

  const [inboxmessage] = await db
    .update(tables.rakimInboxmessages)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.rakimInboxmessages.id, recordId),
        eq(tables.rakimInboxmessages.teamId, teamId),
        eq(tables.rakimInboxmessages.owner, ownerId)
      )
    )
    .returning()

  if (!inboxmessage) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimInboxMessage not found or unauthorized'
    })
  }

  return inboxmessage
}

export async function deleteRakimInboxMessage(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.rakimInboxmessages)
    .where(
      and(
        eq(tables.rakimInboxmessages.id, recordId),
        eq(tables.rakimInboxmessages.teamId, teamId),
        eq(tables.rakimInboxmessages.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimInboxMessage not found or unauthorized'
    })
  }

  return { success: true }
}