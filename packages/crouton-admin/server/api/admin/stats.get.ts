/**
 * Admin Stats API Endpoint
 *
 * GET /api/admin/stats
 *
 * Returns dashboard statistics including:
 * - Total users, new users (today/week)
 * - Banned users count
 * - Total teams, new teams (week)
 * - Active sessions count
 * - Super admin count
 *
 * Requires super admin privileges.
 */
import { eq, and, gte, count } from 'drizzle-orm'
import { user, organization, session, useAdminDb } from '../../utils/db'
import { requireSuperAdmin } from '../../utils/admin'
import type { AdminStats } from '../../../types/admin'

export default defineEventHandler(async (event): Promise<AdminStats> => {
  // Verify super admin access
  await requireSuperAdmin(event)

  const db = useAdminDb()
  const now = new Date()

  // Calculate date thresholds
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Run all counts in parallel for better performance
  const [
    totalUsersResult,
    newUsersTodayResult,
    newUsersWeekResult,
    bannedUsersResult,
    superAdminResult,
    totalTeamsResult,
    newTeamsWeekResult,
    activeSessionsResult,
  ] = await Promise.all([
    // Total users
    db.select({ count: count() }).from(user),

    // New users today
    db.select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, oneDayAgo)),

    // New users this week
    db.select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, oneWeekAgo)),

    // Banned users
    db.select({ count: count() })
      .from(user)
      .where(eq(user.banned, true)),

    // Super admin count
    db.select({ count: count() })
      .from(user)
      .where(eq(user.superAdmin, true)),

    // Total teams (excluding personal)
    db.select({ count: count() })
      .from(organization)
      .where(eq(organization.personal, false)),

    // New teams this week (excluding personal)
    db.select({ count: count() })
      .from(organization)
      .where(and(
        eq(organization.personal, false),
        gte(organization.createdAt, oneWeekAgo)
      )),

    // Active sessions (not expired)
    db.select({ count: count() })
      .from(session)
      .where(gte(session.expiresAt, now)),
  ])

  return {
    totalUsers: totalUsersResult[0]?.count ?? 0,
    newUsersToday: newUsersTodayResult[0]?.count ?? 0,
    newUsersWeek: newUsersWeekResult[0]?.count ?? 0,
    bannedUsers: bannedUsersResult[0]?.count ?? 0,
    superAdminCount: superAdminResult[0]?.count ?? 0,
    totalTeams: totalTeamsResult[0]?.count ?? 0,
    newTeamsWeek: newTeamsWeekResult[0]?.count ?? 0,
    activeSessions: activeSessionsResult[0]?.count ?? 0,
  }
})
