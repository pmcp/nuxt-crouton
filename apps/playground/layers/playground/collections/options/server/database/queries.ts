// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundOption, NewPlaygroundOption } from '../../types'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundOptions(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(user, 'ownerUsers')
  const createdByUsers = alias(user, 'createdByUsers')
  const updatedByUsers = alias(user, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const options = await db
    .select({
      ...tables.playgroundOptions,
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
    .from(tables.playgroundOptions)
    .leftJoin(ownerUsers, eq(tables.playgroundOptions.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.playgroundOptions.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.playgroundOptions.updatedBy, updatedByUsers.id))
    .where(eq(tables.playgroundOptions.teamId, teamId))
    .orderBy(desc(tables.playgroundOptions.createdAt))

  return options
}

export async function getPlaygroundOptionsByIds(teamId: string, optionIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(user, 'ownerUsers')
  const createdByUsers = alias(user, 'createdByUsers')
  const updatedByUsers = alias(user, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const options = await db
    .select({
      ...tables.playgroundOptions,
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
    .from(tables.playgroundOptions)
    .leftJoin(ownerUsers, eq(tables.playgroundOptions.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.playgroundOptions.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.playgroundOptions.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.playgroundOptions.teamId, teamId),
        inArray(tables.playgroundOptions.id, optionIds)
      )
    )
    .orderBy(desc(tables.playgroundOptions.createdAt))

  return options
}

export async function createPlaygroundOption(data: NewPlaygroundOption) {
  const db = useDB()

  const [option] = await db
    .insert(tables.playgroundOptions)
    .values(data)
    .returning()

  return option
}

export async function updatePlaygroundOption(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<PlaygroundOption>
) {
  const db = useDB()

  const [option] = await db
    .update(tables.playgroundOptions)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.playgroundOptions.id, recordId),
        eq(tables.playgroundOptions.teamId, teamId),
        eq(tables.playgroundOptions.owner, ownerId)
      )
    )
    .returning()

  if (!option) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundOption not found or unauthorized'
    })
  }

  return option
}

export async function deletePlaygroundOption(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.playgroundOptions)
    .where(
      and(
        eq(tables.playgroundOptions.id, recordId),
        eq(tables.playgroundOptions.teamId, teamId),
        eq(tables.playgroundOptions.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundOption not found or unauthorized'
    })
  }

  return { success: true }
}