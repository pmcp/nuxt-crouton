// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentTestimonial, NewContentTestimonial } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllContentTestimonials(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const testimonials = await (db as any)
    .select({
      ...tables.contentTestimonials,
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
    .from(tables.contentTestimonials)
    .leftJoin(ownerUser, eq(tables.contentTestimonials.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentTestimonials.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentTestimonials.updatedBy, updatedByUser.id))
    .where(eq(tables.contentTestimonials.teamId, teamId))
    .orderBy(desc(tables.contentTestimonials.createdAt))

  return testimonials
}

export async function getContentTestimonialsByIds(teamId: string, testimonialIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const testimonials = await (db as any)
    .select({
      ...tables.contentTestimonials,
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
    .from(tables.contentTestimonials)
    .leftJoin(ownerUser, eq(tables.contentTestimonials.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentTestimonials.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentTestimonials.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentTestimonials.teamId, teamId),
        inArray(tables.contentTestimonials.id, testimonialIds)
      )
    )
    .orderBy(desc(tables.contentTestimonials.createdAt))

  return testimonials
}

export async function createContentTestimonial(data: NewContentTestimonial) {
  const db = useDB()

  const [testimonial] = await (db as any)
    .insert(tables.contentTestimonials)
    .values(data)
    .returning()

  return testimonial
}

export async function updateContentTestimonial(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<ContentTestimonial>
) {
  const db = useDB()

  const [testimonial] = await (db as any)
    .update(tables.contentTestimonials)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.contentTestimonials.id, recordId),
        eq(tables.contentTestimonials.teamId, teamId),
        eq(tables.contentTestimonials.owner, ownerId)
      )
    )
    .returning()

  if (!testimonial) {
    throw createError({
      status: 404,
      statusText: 'ContentTestimonial not found or unauthorized'
    })
  }

  return testimonial
}

export async function deleteContentTestimonial(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.contentTestimonials)
    .where(
      and(
        eq(tables.contentTestimonials.id, recordId),
        eq(tables.contentTestimonials.teamId, teamId),
        eq(tables.contentTestimonials.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentTestimonial not found or unauthorized'
    })
  }

  return { success: true }
}