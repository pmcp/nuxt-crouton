import { z } from 'zod'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'

export default defineMcpTool({
  description: 'Create a new node in the thinking graph. Can be a root node or a child of an existing node. Use search-graph first to find the right parent.',
  inputSchema: {
    teamId: z.string().describe('Team ID'),
    content: z.string().describe('Node content (the idea, decision, question, or insight)'),
    nodeType: z.enum(['idea', 'insight', 'decision', 'question']).default('idea').describe('Type of thinking node'),
    parentId: z.string().optional().describe('Parent node ID (omit for root node)'),
    starred: z.boolean().optional().default(false).describe('Star this node as important'),
  },
  async handler({ teamId, content, nodeType, parentId, starred }) {
    try {
      // Validate parent exists if specified
      if (parentId) {
        const all = await getAllThinkgraphDecisions(teamId)
        const parent = all.find((d: any) => d.id === parentId)
        if (!parent) {
          return { content: [{ type: 'text' as const, text: `Parent node "${parentId}" not found` }], isError: true }
        }
      }

      const node = await createThinkgraphDecision({
        content,
        nodeType,
        pathType: '',
        parentId: parentId || '',
        source: 'mcp',
        model: '',
        starred: starred || false,
        branchName: '',
        versionTag: '',
        teamId,
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
