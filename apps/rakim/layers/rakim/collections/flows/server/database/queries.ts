// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { RakimFlow, NewRakimFlow } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllRakimFlows(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const flows = await (db as any)
    .select({
      ...tables.rakimFlows,
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
    .from(tables.rakimFlows)
    .leftJoin(ownerUser, eq(tables.rakimFlows.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimFlows.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimFlows.updatedBy, updatedByUser.id))
    .where(eq(tables.rakimFlows.teamId, teamId))
    .orderBy(desc(tables.rakimFlows.createdAt))

  return flows
}

export async function getRakimFlowsByIds(teamId: string, flowIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const flows = await (db as any)
    .select({
      ...tables.rakimFlows,
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
    .from(tables.rakimFlows)
    .leftJoin(ownerUser, eq(tables.rakimFlows.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.rakimFlows.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.rakimFlows.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.rakimFlows.teamId, teamId),
        inArray(tables.rakimFlows.id, flowIds)
      )
    )
    .orderBy(desc(tables.rakimFlows.createdAt))

  return flows
}

export async function createRakimFlow(data: NewRakimFlow) {
  const db = useDB()

  const [flow] = await (db as any)
    .insert(tables.rakimFlows)
    .values(data)
    .returning()

  return flow
}

export async function updateRakimFlow(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<RakimFlow>
) {
  const db = useDB()

  const [flow] = await (db as any)
    .update(tables.rakimFlows)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.rakimFlows.id, recordId),
        eq(tables.rakimFlows.teamId, teamId),
        eq(tables.rakimFlows.owner, ownerId)
      )
    )
    .returning()

  if (!flow) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimFlow not found or unauthorized'
    })
  }

  return flow
}

export async function deleteRakimFlow(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.rakimFlows)
    .where(
      and(
        eq(tables.rakimFlows.id, recordId),
        eq(tables.rakimFlows.teamId, teamId),
        eq(tables.rakimFlows.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RakimFlow not found or unauthorized'
    })
  }

  return { success: true }
}