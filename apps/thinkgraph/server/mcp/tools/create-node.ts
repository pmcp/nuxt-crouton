import { z } from 'zod'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Create a new node in the thinking graph. Can be a root node or a child of an existing node. Use search-graph first to find the right parent.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    graphId: z.string().describe('Graph ID this node belongs to'),
    content: z.string().describe('Node content (the idea, decision, question, or insight)'),
    nodeType: z.enum(['idea', 'insight', 'decision', 'question']).default('idea').describe('Type of thinking node'),
    parentId: z.string().optional().describe('Parent node ID (omit for root node)'),
    starred: z.boolean().optional().default(false).describe('Star this node as important'),
  },
  async handler({ teamId, graphId, content, nodeType, parentId, starred }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)

      // Validate parent exists if specified
      if (parentId) {
        const all = await getAllThinkgraphDecisions(resolvedTeamId)
        const parent = all.find((d: any) => d.id === parentId)
        if (!parent) {
          return { content: [{ type: 'text' as const, text: `Parent node "${parentId}" not found` }], isError: true }
        }
      }

      const node = await createThinkgraphDecision({
        content,
        nodeType,
        pathType: '',
        graphId,
        parentId: parentId || '',
        source: 'mcp',
        model: '',
        starred: starred || false,
        branchName: '',
        versionTag: '',
        teamId: resolvedTeamId,
        owner: 'mcp',
      } as any)

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ created: true, id: node.id, content: node.content, nodeType: node.nodeType }, null, 2)
        }]
      }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  }
})
