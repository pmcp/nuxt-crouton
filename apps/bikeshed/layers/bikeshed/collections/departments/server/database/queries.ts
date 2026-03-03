// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BikeshedDepartment, NewBikeshedDepartment } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBikeshedDepartments(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const departments = await (db as any)
    .select({
      ...tables.bikeshedDepartments,
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
    .from(tables.bikeshedDepartments)
    .leftJoin(ownerUser, eq(tables.bikeshedDepartments.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedDepartments.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedDepartments.updatedBy, updatedByUser.id))
    .where(eq(tables.bikeshedDepartments.teamId, teamId))
    .orderBy(desc(tables.bikeshedDepartments.createdAt))

  return departments
}

export async function getBikeshedDepartmentsByIds(teamId: string, departmentIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const departments = await (db as any)
    .select({
      ...tables.bikeshedDepartments,
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
    .from(tables.bikeshedDepartments)
    .leftJoin(ownerUser, eq(tables.bikeshedDepartments.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedDepartments.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedDepartments.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bikeshedDepartments.teamId, teamId),
        inArray(tables.bikeshedDepartments.id, departmentIds)
      )
    )
    .orderBy(desc(tables.bikeshedDepartments.createdAt))

  return departments
}

export async function createBikeshedDepartment(data: NewBikeshedDepartment) {
  const db = useDB()

  const [department] = await (db as any)
    .insert(tables.bikeshedDepartments)
    .values(data)
    .returning()

  return department
}

export async function updateBikeshedDepartment(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<BikeshedDepartment>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedDepartments.id, recordId),
    eq(tables.bikeshedDepartments.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedDepartments.owner, userId))
  }

  const [department] = await (db as any)
    .update(tables.bikeshedDepartments)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!department) {
    throw createError({
      status: 404,
      statusText: 'BikeshedDepartment not found or unauthorized'
    })
  }

  return department
}

export async function deleteBikeshedDepartment(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedDepartments.id, recordId),
    eq(tables.bikeshedDepartments.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedDepartments.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bikeshedDepartments)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BikeshedDepartment not found or unauthorized'
    })
  }

  return { success: true }
}