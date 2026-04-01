import { z } from 'zod'
import { createThinkgraphNode, getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Create a new node in ThinkGraph. Nodes have templates (idea, research, task, feature, meta) and optional pipeline steps. Use search-graph first to find the right parent.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    projectId: z.string().describe('Project ID this node belongs to'),
    title: z.string().describe('Short post-it headline (5-10 words max)'),
    template: z.enum(['idea', 'research', 'task', 'feature', 'meta']).default('idea').describe('Node template'),
    parentId: z.string().optional().describe('Parent node ID (omit for root node)'),
    starred: z.boolean().optional().default(false).describe('Star this node as important'),
    status: z.enum(['idle', 'draft', 'queued', 'active', 'working', 'waiting', 'blocked', 'done', 'error']).optional().default('idle').describe('Node status'),
    origin: z.enum(['notion', 'ai', 'human', 'mcp']).optional().default('mcp').describe('Where this node originated'),
    brief: z.string().optional().describe('Handoff brief — the context payload for child nodes'),
    contextScope: z.enum(['full', 'branch', 'manual']).optional().describe('How this node gathers context from ancestors'),
    steps: z.array(z.string()).optional().describe('Pipeline step sequence (defaults from template)'),
    assignee: z.enum(['pi', 'human', 'client']).optional().describe('Who is responsible'),
  },
  async handler({ teamId, projectId, title, template, parentId, starred, status, origin, brief, contextScope, steps, assignee }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)

      // Validate parent exists if specified
      if (parentId) {
        const all = await getAllThinkgraphNodes(resolvedTeamId, projectId)
        const parent = all.find((d: any) => d.id === parentId)
        if (!parent) {
          return { content: [{ type: 'text' as const, text: `Parent node "${parentId}" not found` }], isError: true }
        }
      }

      // Default steps from template if not provided
      const TEMPLATE_STEPS: Record<string, string[]> = {
        idea: [],
        research: ['analyse'],
        task: ['analyst', 'builder', 'reviewer', 'merger'],
        feature: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
        meta: ['analyst', 'builder', 'reviewer', 'merger'],
      }
      const nodeSteps = steps || TEMPLATE_STEPS[template] || []

      const node = await createThinkgraphNode({
        projectId,
        title,
        template,
        steps: nodeSteps,
        parentId: parentId || '',
        starred: starred || false,
        teamId: resolvedTeamId,
        owner: 'mcp',
        status: status || 'idle',
        origin: origin || 'mcp',
        brief: brief || '',
        contextScope: contextScope || 'branch',
        assignee: assignee || 'human',
      } as any)

      signalCollectionChange(teamId, 'thinkgraphNodes')

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ created: true, id: node.id, title: node.title, template: node.template, status: node.status, origin: node.origin }, null, 2)
        }]
      }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  }
})
