/**
 * GET /api/teams/:id/mcp-tokens
 *
 * List active MCP tokens for the team.
 * Requires session auth (must be a team member).
 */
export default defineEventHandler(async (event) => {
  const { resolveTeamAndCheckMembership } = await import('@fyit/crouton-auth/server/utils/team')
  const { team } = await resolveTeamAndCheckMembership(event)

  const { listScopedTokensForResource } = await import('@fyit/crouton-auth/server/utils/scoped-access')
  const tokens = await listScopedTokensForResource('mcp', 'mcp-toolkit')

  // Filter to this team's tokens only (listScopedTokensForResource doesn't filter by org)
  // We need to query by org — use the DB directly
  const db = useDB()
  const { scopedAccessToken } = await import('@fyit/crouton-auth/server/database/schema/auth')
  const { eq, and, gt } = await import('drizzle-orm')

  const activeTokens = await db
    .select({
      id: scopedAccessToken.id,
      displayName: scopedAccessToken.displayName,
      role: scopedAccessToken.role,
      expiresAt: scopedAccessToken.expiresAt,
      lastActiveAt: scopedAccessToken.lastActiveAt,
      createdAt: scopedAccessToken.createdAt
    })
    .from(scopedAccessToken)
    .where(
      and(
        eq(scopedAccessToken.organizationId, team.id),
        eq(scopedAccessToken.resourceType, 'mcp'),
        eq(scopedAccessToken.isActive, true),
        gt(scopedAccessToken.expiresAt, new Date())
      )
    )

  return activeTokens
})
