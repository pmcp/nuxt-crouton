import { z } from 'zod'
import { getAllThinkgraphDecisions } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Get the full thinking path for a node — its ancestor chain, siblings, children, and related context. Useful for understanding the reasoning behind a decision.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    graphId: z.string().optional().describe('Graph ID to filter by'),
    nodeId: z.string().describe('Decision node ID'),
  },
  async handler({ teamId, graphId, nodeId }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)
      const all = await getAllThinkgraphDecisions(resolvedTeamId, graphId)
      const target = all.find((d: any) => d.id === nodeId)

      if (!target) {
        return { content: [{ type: 'text' as const, text: `Node "${nodeId}" not found` }], isError: true }
      }

      // Build ancestor chain
      const ancestors: any[] = []
      let current = target
      while (current?.parentId) {
        const parent = all.find((d: any) => d.id === current.parentId)
        if (!parent) break
        ancestors.unshift({ id: parent.id, content: parent.content, nodeType: parent.nodeType })
        current = parent
      }

      // Get siblings (same parent)
      const siblings = all
        .filter((d: any) => d.parentId === target.parentId && d.id !== nodeId)
        .map((d: any) => ({ id: d.id, content: d.content.slice(0, 100), nodeType: d.nodeType }))

      // Get children
      const children = all
        .filter((d: any) => d.parentId === nodeId)
        .map((d: any) => ({
          id: d.id,
          content: d.content.slice(0, 100),
          nodeType: d.nodeType,
          childCount: all.filter((c: any) => c.parentId === d.id).length,
        }))

      const result = {
        node: {
          id: target.id,
          content: target.content,
          nodeType: target.nodeType,
          starred: target.starred,
          source: target.source,
          artifacts: target.artifacts?.map((a: any) => ({
            type: a.type,
            hasContent: !!a.content,
            hasUrl: !!a.url,
          })),
        },
        ancestors,
        siblings,
        children,
        depth: ancestors.length,
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  }
})
