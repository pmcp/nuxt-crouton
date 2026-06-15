import { z } from 'zod'
import { getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Get a full overview of the thinking graph as a tree structure. Shows all nodes organized by their parent-child relationships. Use this to understand the full thinking landscape before making changes.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    graphId: z.string().optional().describe('Graph ID to filter by (if omitted, shows all nodes across all graphs)'),
    starredOnly: z.boolean().optional().default(false).describe('Only show starred nodes'),
  },
  async handler({ teamId, graphId, starredOnly }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)
      let all = await getAllThinkgraphNodes(resolvedTeamId, graphId)

      if (starredOnly) {
        all = all.filter((d: any) => d.starred)
      }

      const roots = all.filter((d: any) => !d.parentId)

      function buildTree(nodeId: string, depth: number): string {
        const node = all.find((d: any) => d.id === nodeId)
        if (!node) return ''
        const indent = '  '.repeat(depth)
        const star = node.starred ? '⭐ ' : ''
        const source = node.source ? ` [${node.source}]` : ''
        let line = `${indent}${star}(${node.nodeType}) ${node.content.slice(0, 120)}${source} [id:${node.id}]\n`

        const children = all.filter((d: any) => d.parentId === nodeId)
        for (const child of children) {
          line += buildTree(child.id, depth + 1)
        }
        return line
      }

      let tree = ''
      for (const root of roots) {
        tree += buildTree(root.id, 0)
      }

      const stats = {
        totalNodes: all.length,
        rootNodes: roots.length,
        starred: all.filter((d: any) => d.starred).length,
        byType: {
          idea: all.filter((d: any) => d.nodeType === 'idea').length,
          insight: all.filter((d: any) => d.nodeType === 'insight').length,
          decision: all.filter((d: any) => d.nodeType === 'decision').length,
          question: all.filter((d: any) => d.nodeType === 'question').length,
        },
      }

      const text = `## Graph Stats\n${JSON.stringify(stats, null, 2)}\n\n## Tree\n${tree || '(empty graph)'}`
      return { content: [{ type: 'text' as const, text }] }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  }
})
