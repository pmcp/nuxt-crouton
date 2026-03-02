// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { Bookingtest3Department, NewBookingtest3Department } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingtest3Departments(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const departments = await (db as any)
    .select({
      ...tables.bookingtest3Departments,
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
    .from(tables.bookingtest3Departments)
    .leftJoin(ownerUser, eq(tables.bookingtest3Departments.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3Departments.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3Departments.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingtest3Departments.teamId, teamId))
    .orderBy(desc(tables.bookingtest3Departments.createdAt))

  return departments
}

export async function getBookingtest3DepartmentsByIds(teamId: string, departmentIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const departments = await (db as any)
    .select({
      ...tables.bookingtest3Departments,
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
    .from(tables.bookingtest3Departments)
    .leftJoin(ownerUser, eq(tables.bookingtest3Departments.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3Departments.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3Departments.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingtest3Departments.teamId, teamId),
        inArray(tables.bookingtest3Departments.id, departmentIds)
      )
    )
    .orderBy(desc(tables.bookingtest3Departments.createdAt))

  return departments
}

export async function createBookingtest3Department(data: NewBookingtest3Department) {
  const db = useDB()

  const [department] = await (db as any)
    .insert(tables.bookingtest3Departments)
    .values(data)
    .returning()

  return department
}

export async function updateBookingtest3Department(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<Bookingtest3Department>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3Departments.id, recordId),
    eq(tables.bookingtest3Departments.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3Departments.owner, userId))
  }

  const [department] = await (db as any)
    .update(tables.bookingtest3Departments)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!department) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3Department not found or unauthorized'
    })
  }

  return department
}

export async function deleteBookingtest3Department(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3Departments.id, recordId),
    eq(tables.bookingtest3Departments.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3Departments.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bookingtest3Departments)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3Department not found or unauthorized'
    })
  }

  return { success: true }
}