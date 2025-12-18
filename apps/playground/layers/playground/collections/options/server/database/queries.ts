// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundOption, NewPlaygroundOption } from '../../types'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundOptions(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const options = await (db as any)
    .select({
      ...tables.playgroundOptions,
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
    .from(tables.playgroundOptions)
    .leftJoin(ownerUser, eq(tables.playgroundOptions.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundOptions.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundOptions.updatedBy, updatedByUser.id))
    .where(eq(tables.playgroundOptions.teamId, teamId))
    .orderBy(desc(tables.playgroundOptions.createdAt))

  return options
}

export async function getPlaygroundOptionsByIds(teamId: string, optionIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const options = await (db as any)
    .select({
      ...tables.playgroundOptions,
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
    .from(tables.playgroundOptions)
    .leftJoin(ownerUser, eq(tables.playgroundOptions.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundOptions.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundOptions.updatedBy, updatedByUser.id))
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

  const [option] = await (db as any)
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

  const [option] = await (db as any)
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

  const [deleted] = await (db as any)
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