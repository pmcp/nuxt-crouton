import type { ThinkgraphNode } from '../../layers/thinkgraph/collections/nodes/types'

export function useContextGenerator(decisions: Ref<ThinkgraphNode[]> | ComputedRef<ThinkgraphNode[]>) {
  const { copy } = useClipboard()
  const { getNodeById, getAncestorChain, getStarredOutsidePath, getPinnedOutsidePath } = useDecisionGraph(decisions)

  function generateContext(nodeId: string, pathType?: string): string {
    const node = getNodeById(nodeId)
    if (!node) return ''

    const chain = getAncestorChain(nodeId)
    const pinned = getPinnedOutsidePath(nodeId)
    const starred = getStarredOutsidePath(nodeId)
    const effectivePathType = pathType || node.pathType || 'diverge'

    const sections: string[] = []

    // Thinking path
    const pathLines = chain.map((n, i) => {
      const indent = '  '.repeat(i)
      const prefix = n.id === nodeId ? `${indent}→ [CURRENT]` : `${indent}→`
      const meta = [n.nodeType, n.versionTag].filter(Boolean).join(', ')
      return `${prefix} ${n.content}${meta ? ` (${meta})` : ''}`
    })

    sections.push(`## Thinking path\n${pathLines.join('\n')}`)

    // Pinned context (always included)
    if (pinned.length > 0) {
      const pinnedLines = pinned.map((n) => {
        const branch = n.branchName ? ` (branch: ${n.branchName})` : ''
        return `📌 ${n.content}${branch}`
      })

      sections.push(
        `## Pinned context (always included)\n${pinnedLines.join('\n')}`,
      )
    }

    // Starred insights
    if (starred.length > 0) {
      const starredLines = starred.map((n) => {
        const branch = n.branchName ? ` (branch: ${n.branchName})` : ''
        return `⭐ ${n.content}${branch}`
      })

      sections.push(
        `## Starred insights from other branches\n${starredLines.join('\n')}`,
      )
    }

    // Task template
    const taskTemplates: Record<string, string> = {
      diverge: `Generate 5-10 different approaches to: ${node.content}`,
      deep_dive: `Go deep on: ${node.content}. Explore implications, edge cases, trade-offs.`,
      prototype: `Create a working prototype for: ${node.content}. Be specific and practical.`,
      converge: `Synthesize these insights into a unified approach: ${node.content}`,
      validate: `Challenge and stress-test this decision: ${node.content}. Find holes.`,
    }

    const task =
      taskTemplates[effectivePathType]
      || taskTemplates.diverge

    sections.push(`## Task\n${task}`)

    // Output format
    sections.push(
      `## Output format\nWhen you reach a key insight or decision, format it as:\nDECISION: {"content": "your insight", "nodeType": "insight"}`,
    )

    return sections.join('\n\n')
  }

  async function copyContext(
    nodeId: string,
    pathType?: string,
  ): Promise<void> {
    const context = generateContext(nodeId, pathType)
    await copy(context)
  }

  return { getAncestorChain, getStarredOutsidePath, getPinnedOutsidePath, generateContext, copyContext }
}
