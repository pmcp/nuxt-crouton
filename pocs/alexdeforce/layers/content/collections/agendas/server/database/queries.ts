// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentAgenda, NewContentAgenda } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllContentAgendas(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const agendas = await (db as any)
    .select({
      ...tables.contentAgendas,
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
    .from(tables.contentAgendas)
    .leftJoin(ownerUser, eq(tables.contentAgendas.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentAgendas.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentAgendas.updatedBy, updatedByUser.id))
    .where(eq(tables.contentAgendas.teamId, teamId))
    .orderBy(desc(tables.contentAgendas.createdAt))

  return agendas
}

export async function getContentAgendasByIds(teamId: string, agendaIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const agendas = await (db as any)
    .select({
      ...tables.contentAgendas,
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
    .from(tables.contentAgendas)
    .leftJoin(ownerUser, eq(tables.contentAgendas.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentAgendas.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentAgendas.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentAgendas.teamId, teamId),
        inArray(tables.contentAgendas.id, agendaIds)
      )
    )
    .orderBy(desc(tables.contentAgendas.createdAt))

  return agendas
}

export async function createContentAgenda(data: NewContentAgenda) {
  const db = useDB()

  const [agenda] = await (db as any)
    .insert(tables.contentAgendas)
    .values(data)
    .returning()

  return agenda
}

export async function updateContentAgenda(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentAgenda>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentAgendas.id, recordId),
    eq(tables.contentAgendas.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentAgendas.owner, userId))
  }

  const [agenda] = await (db as any)
    .update(tables.contentAgendas)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!agenda) {
    throw createError({
      status: 404,
      statusText: 'ContentAgenda not found or unauthorized'
    })
  }

  return agenda
}

export async function deleteContentAgenda(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentAgendas.id, recordId),
    eq(tables.contentAgendas.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentAgendas.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentAgendas)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentAgenda not found or unauthorized'
    })
  }

  return { success: true }
}