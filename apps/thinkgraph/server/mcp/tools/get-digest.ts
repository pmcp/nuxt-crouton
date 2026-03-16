import { z } from 'zod'

export default defineMcpTool({
  name: 'get_digest',
  description: 'Generate a concise digest of a ThinkGraph graph. Returns key decisions, active tensions, next actions, and themes. Useful for quickly understanding the current state of thinking without reading every node.',
  inputSchema: {
    teamId: z.string().describe('Team/organization ID'),
  },
  async handler({ teamId }) {
    try {
      const event = useEvent()
      const data = await $fetch(`/api/teams/${teamId}/thinkgraph-decisions/digest`, {
        method: 'POST',
        headers: event.headers,
      })

      return {
        content: [{
          type: 'text' as const,
          text: (data as any).digest || 'No digest generated',
        }],
      }
    } catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating digest: ${error.message || error}`,
        }],
      }
    }
  },
})
