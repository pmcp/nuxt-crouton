// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PeopleContact, NewPeopleContact } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllPeopleContacts(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const contacts = await (db as any)
    .select({
      ...tables.peopleContacts,
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
    .from(tables.peopleContacts)
    .leftJoin(ownerUser, eq(tables.peopleContacts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.peopleContacts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.peopleContacts.updatedBy, updatedByUser.id))
    .where(eq(tables.peopleContacts.teamId, teamId))
    .orderBy(desc(tables.peopleContacts.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  contacts.forEach((item: any) => {
      // Parse socialLinks from JSON string
      if (typeof item.socialLinks === 'string') {
        try {
          item.socialLinks = JSON.parse(item.socialLinks)
        } catch (e) {
          console.error('Error parsing socialLinks:', e)
          item.socialLinks = null
        }
      }
      if (item.socialLinks === null || item.socialLinks === undefined) {
        item.socialLinks = null
      }
  })

  return contacts
}

export async function getPeopleContactsByIds(teamId: string, contactIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const contacts = await (db as any)
    .select({
      ...tables.peopleContacts,
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
    .from(tables.peopleContacts)
    .leftJoin(ownerUser, eq(tables.peopleContacts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.peopleContacts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.peopleContacts.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.peopleContacts.teamId, teamId),
        inArray(tables.peopleContacts.id, contactIds)
      )
    )
    .orderBy(desc(tables.peopleContacts.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  contacts.forEach((item: any) => {
      // Parse socialLinks from JSON string
      if (typeof item.socialLinks === 'string') {
        try {
          item.socialLinks = JSON.parse(item.socialLinks)
        } catch (e) {
          console.error('Error parsing socialLinks:', e)
          item.socialLinks = null
        }
      }
      if (item.socialLinks === null || item.socialLinks === undefined) {
        item.socialLinks = null
      }
  })

  return contacts
}

export async function createPeopleContact(data: NewPeopleContact) {
  const db = useDB()

  const [contact] = await (db as any)
    .insert(tables.peopleContacts)
    .values(data)
    .returning()

  return contact
}

export async function updatePeopleContact(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<PeopleContact>
) {
  const db = useDB()

  const [contact] = await (db as any)
    .update(tables.peopleContacts)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.peopleContacts.id, recordId),
        eq(tables.peopleContacts.teamId, teamId),
        eq(tables.peopleContacts.owner, ownerId)
      )
    )
    .returning()

  if (!contact) {
    throw createError({
      status: 404,
      statusText: 'PeopleContact not found or unauthorized'
    })
  }

  return contact
}

export async function deletePeopleContact(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.peopleContacts)
    .where(
      and(
        eq(tables.peopleContacts.id, recordId),
        eq(tables.peopleContacts.teamId, teamId),
        eq(tables.peopleContacts.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'PeopleContact not found or unauthorized'
    })
  }

  return { success: true }
}