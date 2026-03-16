import { z } from 'zod'
import { getAllThinkgraphDecisions, updateThinkgraphDecision } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Update an existing node in the thinking graph. Can change content, type, status, brief, context scope, starred status, or reparent it. Only provided fields are updated.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    nodeId: z.string().describe('The node to update'),
    content: z.string().optional().describe('Updated node content'),
    nodeType: z.enum(['idea', 'insight', 'decision', 'question', 'epic', 'user_story', 'task', 'milestone', 'remark', 'fork', 'send']).optional().describe('Change the node type'),
    starred: z.boolean().optional().describe('Star or unstar the node'),
    status: z.enum(['idle', 'draft', 'thinking', 'working', 'blocked', 'needs_attention', 'done', 'error']).optional().describe('Update the visual status'),
    brief: z.string().optional().describe('Set or update the handoff brief'),
    contextScope: z.enum(['full', 'branch', 'manual']).optional().describe('Change context scope'),
    origin: z.enum(['notion', 'ai', 'human', 'mcp']).optional().describe('Change the origin'),
    pathType: z.string().optional().describe('Path type (e.g., "explored", "parked", "committed")'),
    parentId: z.string().optional().describe('Reparent the node under a different parent'),
  },
  async handler({ teamId, nodeId, content, nodeType, starred, pathType, parentId, status, brief, contextScope, origin }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)

      // Build updates from provided fields only
      const updates: Record<string, any> = {}
      if (content !== undefined) updates.content = content
      if (nodeType !== undefined) updates.nodeType = nodeType
      if (starred !== undefined) updates.starred = starred
      if (pathType !== undefined) updates.pathType = pathType
      if (parentId !== undefined) updates.parentId = parentId
      if (status !== undefined) updates.status = status
      if (brief !== undefined) updates.brief = brief
      if (contextScope !== undefined) updates.contextScope = contextScope
      if (origin !== undefined) updates.origin = origin

      if (Object.keys(updates).length === 0) {
        return { content: [{ type: 'text' as const, text: 'No fields to update — provide at least one of: content, nodeType, starred, pathType, parentId' }], isError: true }
      }

      // Validate node and parent exist
      const all = await getAllThinkgraphDecisions(resolvedTeamId)
      const node = all.find((d: any) => d.id === nodeId)
      if (!node) {
        return { content: [{ type: 'text' as const, text: `Node "${nodeId}" not found` }], isError: true }
      }

      if (parentId) {
        if (parentId === nodeId) {
          return { content: [{ type: 'text' as const, text: 'A node cannot be its own parent' }], isError: true }
        }
        const parent = all.find((d: any) => d.id === parentId)
        if (!parent) {
          return { content: [{ type: 'text' as const, text: `Parent node "${parentId}" not found` }], isError: true }
        }
      }

      const result = await updateThinkgraphDecision(nodeId, resolvedTeamId, 'mcp', updates, { role: 'admin' })

      // Signal real-time update — use original slug/id since clients key rooms by slug
      signalCollectionChange(teamId, 'thinkgraphDecisions')

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            updated: true,
            id: result.id,
            content: result.content,
            nodeType: result.nodeType,
            starred: result.starred,
            fieldsChanged: Object.keys(updates),
          }, null, 2),
        }],
      }
    }
    catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  },
})
