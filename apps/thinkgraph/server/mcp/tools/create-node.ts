import { z } from 'zod'
import { getThinkgraphNodesByIds, updateThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

/**
 * NOTE: Despite the legacy filename, this tool no longer creates nodes directly.
 * It proposes a child node by appending to the parent's `suggested-nodes` artifact.
 * The user must explicitly accept the proposal in the slideout to materialize it
 * on the canvas. This enforces the "intentional node creation" rule — AI never
 * grows the canvas without a user click.
 */
export default defineMcpTool({
  description: 'Propose a child node on a parent. The proposal is added to the parent\'s "suggested nodes" list — the user must accept it in the slideout for it to appear on the canvas. Use this whenever you want to suggest follow-up work, insights, or branches based on the work you just did. Multiple proposals append to the same list.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    parentId: z.string().describe('Parent node ID — the node these proposals will be attached to (typically the work item you are currently working on)'),
    title: z.string().describe('Short post-it headline for the proposed node (5-10 words max)'),
    nodeType: z.enum(['idea', 'research', 'task', 'feature', 'meta', 'question', 'observation', 'insight', 'decision']).optional().default('idea').describe('Type of node being proposed'),
    brief: z.string().optional().describe('One-line rationale or context for why this should become a node'),
  },
  async handler({ teamId, parentId, title, nodeType, brief }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)

      const [parent] = await getThinkgraphNodesByIds(resolvedTeamId, [parentId])
      if (!parent) {
        return { content: [{ type: 'text' as const, text: `Parent node "${parentId}" not found` }], isError: true }
      }

      const existingArtifacts = Array.isArray((parent as any).artifacts) ? (parent as any).artifacts : []
      const existingSuggestedIdx = existingArtifacts.findIndex((a: any) => a?.type === 'suggested-nodes')

      const newSuggestion = {
        title,
        nodeType: nodeType || 'idea',
        brief: brief || '',
      }

      let nextArtifacts: any[]
      if (existingSuggestedIdx >= 0) {
        // Append to existing suggested-nodes artifact
        const existing = existingArtifacts[existingSuggestedIdx]
        const existingNodes = Array.isArray(existing?.nodes) ? existing.nodes : []
        nextArtifacts = [
          ...existingArtifacts.slice(0, existingSuggestedIdx),
          {
            ...existing,
            nodes: [...existingNodes, newSuggestion],
            updatedAt: new Date().toISOString(),
          },
          ...existingArtifacts.slice(existingSuggestedIdx + 1),
        ]
      } else {
        // Create new suggested-nodes artifact
        nextArtifacts = [
          ...existingArtifacts,
          {
            type: 'suggested-nodes',
            nodes: [newSuggestion],
            createdAt: new Date().toISOString(),
          },
        ]
      }

      await updateThinkgraphNode(parentId, resolvedTeamId, 'mcp', {
        artifacts: nextArtifacts,
      } as any, { role: 'admin' })

      signalCollectionChange(teamId, 'thinkgraphNodes')

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            proposed: true,
            parentId,
            title,
            nodeType: newSuggestion.nodeType,
            note: 'Proposal added to parent\'s suggested-nodes list. The user must accept it in the slideout to create the actual node.',
          }, null, 2),
        }],
      }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  },
})
