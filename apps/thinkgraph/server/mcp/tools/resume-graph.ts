import { z } from 'zod'

export default defineMcpTool({
  name: 'resume_graph',
  description: 'Get a resume briefing from a ThinkGraph graph. Returns starred nodes, recent activity, open questions, and graph structure summary. Use this at the start of a session to understand the current state of thinking.',
  inputSchema: {
    teamId: z.string().describe('The team ID that owns the graph'),
  },
  async handler({ teamId }) {
    try {
      const result = await $fetch<{ briefing: string; stats: Record<string, number> }>(
        `/api/teams/${teamId}/thinkgraph-nodes/resume`,
      )

      return {
        content: [{
          type: 'text' as const,
          text: result.briefing,
        }],
      }
    }
    catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to generate resume briefing: ${error.message || 'Unknown error'}`,
        }],
      }
    }
  },
})
