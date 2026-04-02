import { z } from 'zod'
import { getThinkgraphNodesByIds } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'
import { buildExpandedNodeContext } from '~~/server/utils/context-builder'

export default defineMcpTool({
  description: 'Get expanded context for a node (~500 tokens). Use when the index-layer summary is not enough detail. Returns full brief, output, and token estimate.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    nodeId: z.string().describe('Node ID to expand'),
  },
  async handler({ teamId, nodeId }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)
      const [node] = await getThinkgraphNodesByIds(resolvedTeamId, [nodeId])

      if (!node) {
        return { content: [{ type: 'text' as const, text: `Node "${nodeId}" not found` }], isError: true }
      }

      const expanded = buildExpandedNodeContext({
        id: node.id,
        title: node.title,
        nodeType: node.template || 'idea',
        status: node.status,
        summary: node.summary,
        brief: node.brief,
        output: node.output,
      })

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(expanded, null, 2),
        }],
      }
    }
    catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  },
})
