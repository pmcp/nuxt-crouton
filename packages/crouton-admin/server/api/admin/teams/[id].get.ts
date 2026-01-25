/**
 * Get Team Details API Endpoint
 *
 * GET /api/admin/teams/[id]
 *
 * Returns detailed team/organization information including:
 * - Organization profile
 * - All members with user details
 *
 * Requires super admin privileges.
 */
import type { H3Event } from 'h3'
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { organization, member, user, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'
import type { AdminTeamDetail } from '../../../../types/admin'

export default defineEventHandler(async (event: H3Event): Promise<AdminTeamDetail> => {
  // Verify super admin access
  await requireSuperAdmin(event)

  const db = useAdminDb()
  const teamId = getRouterParam(event, 'id')

  if (!teamId) {
    throw createError({
      status: 400,
      message: 'Team ID is required'
    })
  }

  // Get organization
  const orgs = await db
    .select()
    .from(organization)
    .where(eq(organization.id, teamId))
    .limit(1)

  if (orgs.length === 0) {
    throw createError({
      status: 404,
      message: 'Team not found'
    })
  }

  const orgData = orgs[0]

  // Get members with user details
  const members = await db
    .select({
      id: member.id,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image
      }
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, teamId))

  // Build response
  const response: AdminTeamDetail = {
    id: orgData.id,
    name: orgData.name,
    slug: orgData.slug,
    logo: orgData.logo,
    metadata: orgData.metadata,
    personal: orgData.personal,
    isDefault: orgData.isDefault,
    ownerId: orgData.ownerId,
    createdAt: orgData.createdAt,
    members: members.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt,
      user: m.user
    }))
  }

  return response
})
