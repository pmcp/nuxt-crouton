import { z } from 'zod'

export default defineMcpTool({
  description: 'Create an MCP access token for a team. Requires an authenticated session (you must be logged in). The token can be used as a Bearer token by MCP clients like Claude Desktop or Cursor. Tokens are team-scoped and time-limited.',
  inputSchema: {
    teamId: z.string().describe('Team/organization ID or slug'),
    displayName: z.string().optional().default('MCP Client').describe('Label for this token (e.g., "Claude Desktop", "Cursor")'),
    expiresInDays: z.number().optional().default(90).describe('Token lifetime in days (default: 90)')
  },
  async handler({ teamId, displayName, expiresInDays }) {
    try {
      const event = useEvent()

      // Require session auth — only logged-in users can create tokens
      const { resolveTeamAndCheckMembership } = await import('@fyit/crouton-auth/server/utils/team')
      event.context.params = event.context.params || {}
      event.context.params.id = teamId
      const { team } = await resolveTeamAndCheckMembership(event)

      const { createScopedToken } = await import('@fyit/crouton-auth/server/utils/scoped-access')
      const { token, expiresAt } = await createScopedToken({
        organizationId: team.id,
        resourceType: 'mcp',
        resourceId: 'mcp-toolkit',
        displayName,
        role: 'member',
        expiresIn: expiresInDays * 24 * 60 * 60 * 1000
      })

      return jsonResult({
        token,
        teamId: team.id,
        teamName: team.name,
        displayName,
        expiresAt: expiresAt.toISOString(),
        usage: `Add to your MCP client config:\n  "headers": { "Authorization": "Bearer ${token}" }`
      })
    }
    catch (error: any) {
      return errorResult(`Error creating MCP token: ${error.message || error}`)
    }
  }
})
