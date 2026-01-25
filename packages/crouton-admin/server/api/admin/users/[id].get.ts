/**
 * Get User Details API Endpoint
 *
 * GET /api/admin/users/[id]
 *
 * Returns detailed user information including:
 * - User profile
 * - Team memberships
 * - OAuth accounts
 * - Active sessions
 *
 * Requires super admin privileges.
 */
import type { H3Event } from 'h3'
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { user, session, account, member, organization, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'
import type { AdminUserDetail } from '../../../../types/admin'

export default defineEventHandler(async (event: H3Event): Promise<AdminUserDetail> => {
  // Verify super admin access
  await requireSuperAdmin(event)

  const db = useAdminDb()
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      status: 400,
      message: 'User ID is required'
    })
  }

  // Get user
  const users = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (users.length === 0) {
    throw createError({
      status: 404,
      message: 'User not found'
    })
  }

  const userData = users[0]

  // Get memberships with organization details
  const memberships = await db
    .select({
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug
      }
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))

  // Get OAuth accounts
  const accounts = await db
    .select({
      id: account.id,
      providerId: account.providerId,
      createdAt: account.createdAt
    })
    .from(account)
    .where(eq(account.userId, userId))

  // Get active sessions
  const sessions = await db
    .select({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      impersonatingFrom: session.impersonatingFrom
    })
    .from(session)
    .where(eq(session.userId, userId))

  // Build response
  const response: AdminUserDetail = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    emailVerified: userData.emailVerified,
    image: userData.image,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
    stripeCustomerId: userData.stripeCustomerId,
    superAdmin: userData.superAdmin,
    banned: userData.banned,
    bannedReason: userData.bannedReason,
    bannedUntil: userData.bannedUntil,
    memberships: memberships.map(m => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt,
      organization: m.organization
    })),
    sessions: sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      impersonatingFrom: s.impersonatingFrom
    })),
    accounts: accounts.map(a => ({
      id: a.id,
      providerId: a.providerId,
      createdAt: a.createdAt
    }))
  }

  return response
})
