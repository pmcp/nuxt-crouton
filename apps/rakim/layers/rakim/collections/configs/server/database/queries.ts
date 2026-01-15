// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimConfig, NewRakimConfig } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllRakimConfigs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const configs = await db
    .select({
      ...tables.rakimConfigs,
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
    .from(tables.rakimConfigs)
    .leftJoin(ownerUser, eq(tables.rakimConfigs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimConfigs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimConfigs.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimConfigs.teamId, teamId))
    .orderBy(desc(tables.rakimConfigs.createdAt))

  return configs
}

export async function getRakimConfigsByIds(teamId: string, configIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user, 'ownerUser')
  const createdByUser = alias(user, 'createdByUser')
  const updatedByUser = alias(user, 'updatedByUser')

  const configs = await db
    .select({
      ...tables.rakimConfigs,
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
    .from(tables.rakimConfigs)
    .leftJoin(ownerUser, eq(tables.rakimConfigs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimConfigs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimConfigs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimConfigs.teamId, teamId),
        inArray(tables.rakimConfigs.id, configIds)
      )
    )
    .orderBy(desc(tables.rakimConfigs.createdAt))

  return configs
}

export async function createRakimConfig(data: NewRakimConfig) {
  const db = useDB()

  const [config] = await db
    .insert(tables.rakimConfigs)
    .values(data)
    .returning()

  return config
}

export async function updateRakimConfig(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimConfig>
) {
  const db = useDB()

  const [config] = await db
    .update(tables.rakimConfigs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.rakimConfigs.id, recordId),
        eq(tables.rakimConfigs.teamId, teamId),
        eq(tables.rakimConfigs.owner, ownerId)
      )
    )
    .returning()

  if (!config) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimConfig not found or unauthorized'
    })
  }

  return config
}

export async function deleteRakimConfig(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.rakimConfigs)
    .where(
      and(
        eq(tables.rakimConfigs.id, recordId),
        eq(tables.rakimConfigs.teamId, teamId),
        eq(tables.rakimConfigs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimConfig not found or unauthorized'
    })
  }

  return { success: true }
}

/**
 * Find config by email address or email slug
 * Used by resend webhook to match incoming emails to configs
 */
export async function findRakimConfigByEmail(emailAddress: string) {
  const db = useDB()

  // Extract email slug (part before @) for matching
  const emailSlug = emailAddress.split('@')[0]

  const [config] = await db
    .select()
    .from(tables.rakimConfigs)
    .where(
      and(
        eq(tables.rakimConfigs.emailAddress, emailAddress)
      )
    )
    .limit(1)

  // If not found by exact email, try by slug
  if (!config) {
    const [configBySlug] = await db
      .select()
      .from(tables.rakimConfigs)
      .where(
        and(
          eq(tables.rakimConfigs.emailSlug, emailSlug)
        )
      )
      .limit(1)

    return configBySlug || null
  }

  return config
}