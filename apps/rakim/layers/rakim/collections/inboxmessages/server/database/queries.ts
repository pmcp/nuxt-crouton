// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DiscubotInboxMessage, NewDiscubotInboxMessage } from '../../types'
import * as configsSchema from '../../../configs/server/database/schema'
import { users } from '~~/server/database/schema'

export async function getAllDiscubotInboxMessages(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const inboxmessages = await db
    .select({
      ...tables.discubotInboxmessages,
      configIdData: configsSchema.discubotConfigs,
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
    .from(tables.discubotInboxmessages)
    .leftJoin(configsSchema.discubotConfigs, eq(tables.discubotInboxmessages.configId, configsSchema.discubotConfigs.id))
    .leftJoin(ownerUsers, eq(tables.discubotInboxmessages.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotInboxmessages.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotInboxmessages.updatedBy, updatedByUsers.id))
    .where(eq(tables.discubotInboxmessages.teamId, teamId))
    .orderBy(desc(tables.discubotInboxmessages.createdAt))

  return inboxmessages
}

export async function getDiscubotInboxMessagesByIds(teamId: string, inboxmessageIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const inboxmessages = await db
    .select({
      ...tables.discubotInboxmessages,
      configIdData: configsSchema.discubotConfigs,
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
    .from(tables.discubotInboxmessages)
    .leftJoin(configsSchema.discubotConfigs, eq(tables.discubotInboxmessages.configId, configsSchema.discubotConfigs.id))
    .leftJoin(ownerUsers, eq(tables.discubotInboxmessages.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotInboxmessages.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotInboxmessages.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.discubotInboxmessages.teamId, teamId),
        inArray(tables.discubotInboxmessages.id, inboxmessageIds)
      )
    )
    .orderBy(desc(tables.discubotInboxmessages.createdAt))

  return inboxmessages
}

export async function createDiscubotInboxMessage(data: NewDiscubotInboxMessage) {
  const db = useDB()

  const [inboxmessage] = await db
    .insert(tables.discubotInboxmessages)
    .values(data)
    .returning()

  return inboxmessage
}

export async function updateDiscubotInboxMessage(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DiscubotInboxMessage>
) {
  const db = useDB()

  const [inboxmessage] = await db
    .update(tables.discubotInboxmessages)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.discubotInboxmessages.id, recordId),
        eq(tables.discubotInboxmessages.teamId, teamId),
        eq(tables.discubotInboxmessages.owner, ownerId)
      )
    )
    .returning()

  if (!inboxmessage) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotInboxMessage not found or unauthorized'
    })
  }

  return inboxmessage
}

export async function deleteDiscubotInboxMessage(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.discubotInboxmessages)
    .where(
      and(
        eq(tables.discubotInboxmessages.id, recordId),
        eq(tables.discubotInboxmessages.teamId, teamId),
        eq(tables.discubotInboxmessages.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotInboxMessage not found or unauthorized'
    })
  }

  return { success: true }
}