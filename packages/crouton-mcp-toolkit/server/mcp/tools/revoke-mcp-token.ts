import { z } from 'zod'

export default defineMcpTool({
  description: 'Revoke an MCP access token. Requires an authenticated session.',
  inputSchema: {
    token: z.string().describe('The token string to revoke')
  },
  async handler({ token }) {
    try {
      const event = useEvent()

      // Require session auth
      const { requireAuth } = await import('@fyit/crouton-auth/server/utils/auth')
      await requireAuth(event)

      const { revokeScopedToken } = await import('@fyit/crouton-auth/server/utils/scoped-access')
      const revoked = await revokeScopedToken(token)

      if (!revoked) {
        return errorResult('Token not found or already revoked.')
      }

      return jsonResult({ success: true, message: 'MCP token revoked successfully.' })
    }
    catch (error: any) {
      return errorResult(`Error revoking token: ${error.message || error}`)
    }
  }
})
