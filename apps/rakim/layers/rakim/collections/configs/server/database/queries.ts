// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { DiscubotConfig, NewDiscubotConfig } from '../../types'
import { users } from '~~/server/database/schema'

export async function getAllDiscubotConfigs(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const configs = await db
    .select({
      ...tables.discubotConfigs,
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
    .from(tables.discubotConfigs)
    .leftJoin(ownerUsers, eq(tables.discubotConfigs.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotConfigs.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotConfigs.updatedBy, updatedByUsers.id))
    .where(eq(tables.discubotConfigs.teamId, teamId))
    .orderBy(desc(tables.discubotConfigs.createdAt))

  return configs
}

export async function getDiscubotConfigsByIds(teamId: string, configIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  const configs = await db
    .select({
      ...tables.discubotConfigs,
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
    .from(tables.discubotConfigs)
    .leftJoin(ownerUsers, eq(tables.discubotConfigs.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.discubotConfigs.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.discubotConfigs.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.discubotConfigs.teamId, teamId),
        inArray(tables.discubotConfigs.id, configIds)
      )
    )
    .orderBy(desc(tables.discubotConfigs.createdAt))

  return configs
}

export async function createDiscubotConfig(data: NewDiscubotConfig) {
  const db = useDB()

  const [config] = await db
    .insert(tables.discubotConfigs)
    .values(data)
    .returning()

  return config
}

export async function updateDiscubotConfig(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<DiscubotConfig>
) {
  const db = useDB()

  const [config] = await db
    .update(tables.discubotConfigs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.discubotConfigs.id, recordId),
        eq(tables.discubotConfigs.teamId, teamId),
        eq(tables.discubotConfigs.owner, ownerId)
      )
    )
    .returning()

  if (!config) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotConfig not found or unauthorized'
    })
  }

  return config
}

export async function deleteDiscubotConfig(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.discubotConfigs)
    .where(
      and(
        eq(tables.discubotConfigs.id, recordId),
        eq(tables.discubotConfigs.teamId, teamId),
        eq(tables.discubotConfigs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DiscubotConfig not found or unauthorized'
    })
  }

  return { success: true }
}

/**
 * Find config by email address or email slug
 * Used by resend webhook to match incoming emails to configs
 */
export async function findDiscubotConfigByEmail(emailAddress: string) {
  const db = useDB()

  // Extract email slug (part before @) for matching
  const emailSlug = emailAddress.split('@')[0]

  const [config] = await db
    .select()
    .from(tables.discubotConfigs)
    .where(
      and(
        eq(tables.discubotConfigs.emailAddress, emailAddress)
      )
    )
    .limit(1)

  // If not found by exact email, try by slug
  if (!config) {
    const [configBySlug] = await db
      .select()
      .from(tables.discubotConfigs)
      .where(
        and(
          eq(tables.discubotConfigs.emailSlug, emailSlug)
        )
      )
      .limit(1)

    return configBySlug || null
  }

  return config
}