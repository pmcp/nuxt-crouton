// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { KnowledgeBaseNote, NewKnowledgeBaseNote } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllKnowledgeBaseNotes(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const notes = await (db as any)
    .select({
      ...tables.knowledgeBaseNotes,
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
    .from(tables.knowledgeBaseNotes)
    .leftJoin(ownerUser, eq(tables.knowledgeBaseNotes.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.knowledgeBaseNotes.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.knowledgeBaseNotes.updatedBy, updatedByUser.id))
    .where(eq(tables.knowledgeBaseNotes.teamId, teamId))
    .orderBy(asc(tables.knowledgeBaseNotes.order), desc(tables.knowledgeBaseNotes.createdAt))

  return notes
}

export async function getKnowledgeBaseNotesByIds(teamId: string, noteIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const notes = await (db as any)
    .select({
      ...tables.knowledgeBaseNotes,
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
    .from(tables.knowledgeBaseNotes)
    .leftJoin(ownerUser, eq(tables.knowledgeBaseNotes.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.knowledgeBaseNotes.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.knowledgeBaseNotes.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.knowledgeBaseNotes.teamId, teamId),
        inArray(tables.knowledgeBaseNotes.id, noteIds)
      )
    )
    .orderBy(asc(tables.knowledgeBaseNotes.order), desc(tables.knowledgeBaseNotes.createdAt))

  return notes
}

export async function createKnowledgeBaseNote(data: NewKnowledgeBaseNote) {
  const db = useDB()

  const [note] = await (db as any)
    .insert(tables.knowledgeBaseNotes)
    .values(data)
    .returning()

  return note
}

export async function updateKnowledgeBaseNote(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<KnowledgeBaseNote>
) {
  const db = useDB()

  const [note] = await (db as any)
    .update(tables.knowledgeBaseNotes)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.knowledgeBaseNotes.id, recordId),
        eq(tables.knowledgeBaseNotes.teamId, teamId),
        eq(tables.knowledgeBaseNotes.owner, ownerId)
      )
    )
    .returning()

  if (!note) {
    throw createError({
      statusCode: 404,
      statusMessage: 'KnowledgeBaseNote not found or unauthorized'
    })
  }

  return note
}

export async function deleteKnowledgeBaseNote(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.knowledgeBaseNotes)
    .where(
      and(
        eq(tables.knowledgeBaseNotes.id, recordId),
        eq(tables.knowledgeBaseNotes.teamId, teamId),
        eq(tables.knowledgeBaseNotes.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'KnowledgeBaseNote not found or unauthorized'
    })
  }

  return { success: true }
}

// Sortable reorder queries (auto-generated when sortable: true)

export async function reorderSiblingsKnowledgeBaseNotes(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = await Promise.all(
    updates.map(({ id, order }) =>
      (db as any)
        .update(tables.knowledgeBaseNotes)
        .set({ order })
        .where(
          and(
            eq(tables.knowledgeBaseNotes.id, id),
            eq(tables.knowledgeBaseNotes.teamId, teamId)
          )
        )
        .returning()
    )
  )

  return { success: true, updated: results.flat().length }
}