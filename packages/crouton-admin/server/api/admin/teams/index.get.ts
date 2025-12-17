/**
 * List Teams API Endpoint
 *
 * GET /api/admin/teams
 *
 * Returns paginated list of teams/organizations with filtering options.
 * Requires super admin privileges.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - search: Search by name or slug
 * - personal: Filter by personal teams (true/false)
 * - sortBy: Sort field ('name', 'createdAt', 'memberCount')
 * - sortOrder: Sort order ('asc', 'desc')
 */
import type { H3Event } from 'h3'
import { defineEventHandler, getQuery } from 'h3'
import { eq, like, or, and, desc, asc, count, sql } from 'drizzle-orm'
import { organization, member, user, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'
import type { AdminTeamListItem, PaginatedResponse, TeamListFilters } from '../../../../types/admin'

export default defineEventHandler(async (event: H3Event): Promise<PaginatedResponse<AdminTeamListItem>> => {
  // Verify super admin access
  await requireSuperAdmin(event)

  const db = useAdminDb()

  // Parse query parameters
  const query = getQuery(event) as TeamListFilters
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const search = query.search?.trim()
  const personalFilter = query.personal
  const sortBy = query.sortBy || 'createdAt'
  const sortOrder = query.sortOrder || 'desc'

  // Build where conditions
  const conditions = []

  // Search filter
  if (search) {
    conditions.push(
      or(
        like(organization.name, `%${search}%`),
        like(organization.slug, `%${search}%`)
      )
    )
  }

  // Personal filter
  if (personalFilter !== undefined) {
    const isPersonal = personalFilter === true || String(personalFilter) === 'true'
    conditions.push(eq(organization.personal, isPersonal))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(organization)
    .where(whereClause)

  const total = countResult[0]?.count ?? 0

  // Build order by (note: memberCount sorting requires subquery)
  const orderByColumn = sortBy === 'name' ? organization.name : organization.createdAt
  const orderByFn = sortOrder === 'asc' ? asc : desc

  // Get organizations with pagination
  const teams = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      personal: organization.personal,
      isDefault: organization.isDefault,
      ownerId: organization.ownerId,
      createdAt: organization.createdAt,
    })
    .from(organization)
    .where(whereClause)
    .orderBy(orderByFn(orderByColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // Get member counts for each team
  const teamIds = teams.map(t => t.id)
  const memberCounts = teamIds.length > 0
    ? await db
        .select({
          organizationId: member.organizationId,
          count: count(),
        })
        .from(member)
        .where(sql`${member.organizationId} IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(member.organizationId)
    : []

  // Create a map of team ID to member count
  const countMap = new Map(memberCounts.map(mc => [mc.organizationId, mc.count]))

  // Get owner info for teams
  const ownerIds = teams.map(t => t.ownerId).filter((id): id is string => id !== null)
  const owners = ownerIds.length > 0
    ? await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
        })
        .from(user)
        .where(sql`${user.id} IN (${sql.join(ownerIds.map(id => sql`${id}`), sql`, `)})`)
    : []

  // Create a map of owner ID to owner info
  const ownerMap = new Map(owners.map(o => [o.id, o]))

  // Map to response type
  const items: AdminTeamListItem[] = teams.map(t => {
    const owner = t.ownerId ? ownerMap.get(t.ownerId) : null
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      logo: t.logo,
      personal: t.personal,
      isDefault: t.isDefault,
      createdAt: t.createdAt,
      memberCount: countMap.get(t.id) ?? 0,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
    }
  })

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
})
