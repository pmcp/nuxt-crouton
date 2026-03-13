/**
 * DELETE /api/teams/:id/mcp-tokens/:tokenId
 *
 * Revoke an MCP token by ID.
 * Requires session auth (must be a team member).
 */
export default defineEventHandler(async (event) => {
  const { resolveTeamAndCheckMembership } = await import('@fyit/crouton-auth/server/utils/team')
  const { team } = await resolveTeamAndCheckMembership(event)

  const tokenId = getRouterParam(event, 'tokenId')
  if (!tokenId) {
    throw createError({ status: 400, statusText: 'Token ID is required' })
  }

  const db = useDB()
  const { scopedAccessToken } = await import('@fyit/crouton-auth/server/database/schema/auth')
  const { eq, and } = await import('drizzle-orm')

  // Only revoke tokens belonging to this team with resourceType 'mcp'
  const result = await db
    .update(scopedAccessToken)
    .set({ isActive: false })
    .where(
      and(
        eq(scopedAccessToken.id, tokenId),
        eq(scopedAccessToken.organizationId, team.id),
        eq(scopedAccessToken.resourceType, 'mcp')
      )
    )

  if (result.rowsAffected === 0) {
    throw createError({ status: 404, statusText: 'Token not found' })
  }

  return { success: true }
})
