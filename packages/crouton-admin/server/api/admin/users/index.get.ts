/**
 * List Users API Endpoint
 *
 * GET /api/admin/users
 *
 * Returns paginated list of users with filtering options.
 * Requires super admin privileges.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - search: Search by name or email
 * - status: Filter by 'active', 'banned', or 'all' (default: 'all')
 * - superAdmin: Filter by super admin status (true/false)
 * - sortBy: Sort field ('name', 'email', 'createdAt')
 * - sortOrder: Sort order ('asc', 'desc')
 */
import { eq, like, or, and, desc, asc, count, sql } from 'drizzle-orm'
import { user, member, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'
import type { AdminUserListItem, PaginatedResponse, UserListFilters } from '../../../../types/admin'

export default defineEventHandler(async (event): Promise<PaginatedResponse<AdminUserListItem>> => {
  // Verify super admin access
  await requireSuperAdmin(event)

  const db = useAdminDb()

  // Parse query parameters
  const query = getQuery(event) as UserListFilters
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const search = query.search?.trim()
  const status = query.status || 'all'
  const superAdminFilter = query.superAdmin
  const sortBy = query.sortBy || 'createdAt'
  const sortOrder = query.sortOrder || 'desc'

  // Build where conditions
  const conditions = []

  // Search filter
  if (search) {
    conditions.push(
      or(
        like(user.name, `%${search}%`),
        like(user.email, `%${search}%`)
      )
    )
  }

  // Status filter
  if (status === 'active') {
    conditions.push(eq(user.banned, false))
  } else if (status === 'banned') {
    conditions.push(eq(user.banned, true))
  }

  // Super admin filter
  if (superAdminFilter !== undefined) {
    const isSuperAdmin = superAdminFilter === true || String(superAdminFilter) === 'true'
    conditions.push(eq(user.superAdmin, isSuperAdmin))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(user)
    .where(whereClause)

  const total = countResult[0]?.count ?? 0

  // Build order by
  const orderByColumn = sortBy === 'name' ? user.name
    : sortBy === 'email' ? user.email
    : user.createdAt
  const orderByFn = sortOrder === 'asc' ? asc : desc

  // Get users with pagination
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      superAdmin: user.superAdmin,
      banned: user.banned,
      bannedReason: user.bannedReason,
      bannedUntil: user.bannedUntil,
    })
    .from(user)
    .where(whereClause)
    .orderBy(orderByFn(orderByColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // Get membership counts for each user
  const userIds = users.map(u => u.id)
  const membershipCounts = userIds.length > 0
    ? await db
        .select({
          userId: member.userId,
          count: count(),
        })
        .from(member)
        .where(sql`${member.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(member.userId)
    : []

  // Create a map of user ID to membership count
  const countMap = new Map(membershipCounts.map(mc => [mc.userId, mc.count]))

  // Map to response type
  const items: AdminUserListItem[] = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image,
    createdAt: u.createdAt,
    superAdmin: u.superAdmin,
    banned: u.banned,
    bannedReason: u.bannedReason,
    bannedUntil: u.bannedUntil,
    membershipCount: countMap.get(u.id) ?? 0,
  }))

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
})
