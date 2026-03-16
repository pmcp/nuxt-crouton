import { z } from 'zod'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Create a new node in the thinking graph. Supports thinking nodes (idea, insight, decision, question), planning nodes (epic, user_story, task), and execution nodes (milestone, remark, fork, send). Use search-graph first to find the right parent.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    graphId: z.string().describe('Graph ID this node belongs to'),
    content: z.string().describe('Node content (the idea, decision, question, or insight)'),
    nodeType: z.enum(['idea', 'insight', 'decision', 'question', 'epic', 'user_story', 'task', 'milestone', 'remark', 'fork', 'send']).default('idea').describe('Type of node'),
    parentId: z.string().optional().describe('Parent node ID (omit for root node)'),
    starred: z.boolean().optional().default(false).describe('Star this node as important'),
    status: z.enum(['idle', 'draft', 'thinking', 'working', 'blocked', 'needs_attention', 'done', 'error']).optional().default('idle').describe('Node status for visual state'),
    origin: z.enum(['notion', 'ai', 'human', 'mcp']).optional().default('mcp').describe('Where this node originated'),
    brief: z.string().optional().describe('Handoff brief — the context payload for child nodes'),
    contextScope: z.enum(['full', 'branch', 'manual']).optional().describe('How this node gathers context from ancestors'),
    notionId: z.string().optional().describe('Notion page ID if synced from Notion'),
  },
  async handler({ teamId, graphId, content, nodeType, parentId, starred, status, origin, brief, contextScope, notionId }) {
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
        status: status || 'idle',
        origin: origin || 'mcp',
        brief: brief || '',
        contextScope: contextScope || 'branch',
        notionId: notionId || '',
      } as any)

      // Signal real-time update — use original slug/id since clients key rooms by slug
      signalCollectionChange(teamId, 'thinkgraphDecisions')

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ created: true, id: node.id, content: node.content, nodeType: node.nodeType, status: node.status, origin: node.origin }, null, 2)
        }]
      }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  }
})
