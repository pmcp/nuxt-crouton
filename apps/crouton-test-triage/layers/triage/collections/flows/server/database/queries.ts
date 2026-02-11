// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { TriageFlow, NewTriageFlow } from '../../types'
import { user } from '~~/server/db/schema'

// Select fields for GET responses — excludes anthropicApiKey (encrypted secret)
const triageFlowPublicSelect = {
  id: tables.triageFlows.id,
  teamId: tables.triageFlows.teamId,
  owner: tables.triageFlows.owner,
  order: tables.triageFlows.order,
  name: tables.triageFlows.name,
  description: tables.triageFlows.description,
  availableDomains: tables.triageFlows.availableDomains,
  aiEnabled: tables.triageFlows.aiEnabled,
  anthropicApiKeyHint: tables.triageFlows.anthropicApiKeyHint,
  aiSummaryPrompt: tables.triageFlows.aiSummaryPrompt,
  aiTaskPrompt: tables.triageFlows.aiTaskPrompt,
  active: tables.triageFlows.active,
  onboardingComplete: tables.triageFlows.onboardingComplete,
  createdAt: tables.triageFlows.createdAt,
  updatedAt: tables.triageFlows.updatedAt,
  createdBy: tables.triageFlows.createdBy,
  updatedBy: tables.triageFlows.updatedBy,
}

export async function getAllTriageFlows(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const flows = await (db as any)
    .select({
      ...triageFlowPublicSelect,
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
    .from(tables.triageFlows)
    .leftJoin(ownerUser, eq(tables.triageFlows.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageFlows.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageFlows.updatedBy, updatedByUser.id))
    .where(eq(tables.triageFlows.teamId, teamId))
    .orderBy(desc(tables.triageFlows.createdAt))

  return flows
}

export async function getTriageFlowsByIds(teamId: string, flowIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const flows = await (db as any)
    .select({
      ...triageFlowPublicSelect,
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
    .from(tables.triageFlows)
    .leftJoin(ownerUser, eq(tables.triageFlows.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.triageFlows.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.triageFlows.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.triageFlows.teamId, teamId),
        inArray(tables.triageFlows.id, flowIds)
      )
    )
    .orderBy(desc(tables.triageFlows.createdAt))

  return flows
}

/** Server-only: get the encrypted API key for a flow (never expose to client) */
export async function getTriageFlowEncryptedKey(flowId: string, teamId: string) {
  const db = useDB()

  const [flow] = await (db as any)
    .select({
      anthropicApiKey: tables.triageFlows.anthropicApiKey,
    })
    .from(tables.triageFlows)
    .where(
      and(
        eq(tables.triageFlows.id, flowId),
        eq(tables.triageFlows.teamId, teamId),
      ),
    )

  return flow?.anthropicApiKey as string | null
}

export async function createTriageFlow(data: NewTriageFlow) {
  const db = useDB()

  const [flow] = await (db as any)
    .insert(tables.triageFlows)
    .values(data)
    .returning()

  return flow
}

export async function updateTriageFlow(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<TriageFlow>
) {
  const db = useDB()

  const [flow] = await (db as any)
    .update(tables.triageFlows)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.triageFlows.id, recordId),
        eq(tables.triageFlows.teamId, teamId),
        eq(tables.triageFlows.owner, ownerId)
      )
    )
    .returning()

  if (!flow) {
    throw createError({
      status: 404,
      statusText: 'TriageFlow not found or unauthorized'
    })
  }

  return flow
}

export async function deleteTriageFlow(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.triageFlows)
    .where(
      and(
        eq(tables.triageFlows.id, recordId),
        eq(tables.triageFlows.teamId, teamId),
        eq(tables.triageFlows.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'TriageFlow not found or unauthorized'
    })
  }

  return { success: true }
}