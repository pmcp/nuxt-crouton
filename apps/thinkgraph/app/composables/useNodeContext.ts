import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'

export interface ContextPayload {
  /** The node requesting context */
  nodeId: string
  /** Ordered ancestor chain (root first, target node last) */
  chain: ContextEntry[]
  /** Total token estimate for the assembled context */
  tokenEstimate: number
  /** Formatted markdown context string */
  markdown: string
}

export interface ContextEntry {
  id: string
  title: string
  nodeType: string
  status: string
  brief?: string
  output?: string
  depth: number
}

/**
 * Client-side composable for building context payloads from node ancestor chains.
 * Walks the parentId hierarchy and assembles context based on the node's contextScope.
 */
export function useNodeContext(nodes: Ref<ThinkgraphNode[]> | ComputedRef<ThinkgraphNode[]>) {
  const nodeMap = computed(() => {
    const map = new Map<string, ThinkgraphNode>()
    for (const n of nodes.value) {
      map.set(n.id, n)
    }
    return map
  })

  /** Walk the ancestor chain from root → node */
  function getAncestorChain(nodeId: string): ThinkgraphNode[] {
    const chain: ThinkgraphNode[] = []
    let current = nodeMap.value.get(nodeId)
    while (current) {
      chain.unshift(current)
      current = current.parentId ? nodeMap.value.get(current.parentId) : undefined
    }
    return chain
  }

  /** Get ancestor IDs (not including the node itself) */
  function getAncestorIds(nodeId: string): string[] {
    const chain = getAncestorChain(nodeId)
    return chain.slice(0, -1).map(n => n.id)
  }

  /** Get direct children of a node */
  function getChildren(nodeId: string): ThinkgraphNode[] {
    return nodes.value.filter(n => n.parentId === nodeId)
  }

  /** Get sibling nodes (same parent, excluding self) */
  function getSiblings(nodeId: string): ThinkgraphNode[] {
    const node = nodeMap.value.get(nodeId)
    if (!node) return []
    return nodes.value.filter(n => n.parentId === node.parentId && n.id !== nodeId)
  }

  /** Rough token estimate: ~4 chars per token */
  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Build context payload based on node's contextScope:
   * - full: entire ancestor chain briefs/outputs
   * - branch: direct parent chain only (default)
   * - manual: only nodes listed in contextNodeIds
   */
  function buildContext(nodeId: string): ContextPayload {
    const node = nodeMap.value.get(nodeId)
    if (!node) {
      return { nodeId, chain: [], tokenEstimate: 0, markdown: '' }
    }

    const scope = node.contextScope || 'branch'
    let contextNodes: ThinkgraphNode[]

    if (scope === 'manual' && node.contextNodeIds) {
      // Manual: cherry-picked nodes
      const ids = Array.isArray(node.contextNodeIds)
        ? node.contextNodeIds as string[]
        : Object.keys(node.contextNodeIds)
      contextNodes = ids
        .map(id => nodeMap.value.get(id))
        .filter((n): n is ThinkgraphNode => !!n)
    }
    else {
      // branch (default) or full: walk ancestor chain
      contextNodes = getAncestorChain(nodeId)
    }

    const chain: ContextEntry[] = contextNodes.map(n => ({
      id: n.id,
      title: n.title,
      nodeType: n.nodeType,
      status: n.status,
      brief: n.brief || undefined,
      output: n.output || undefined,
      depth: n.depth ?? 0,
    }))

    const markdown = formatContextMarkdown(chain, node)
    const tokenEstimate = estimateTokens(markdown)

    return { nodeId, chain, tokenEstimate, markdown }
  }

  /** Format context chain as prompt-ready markdown */
  function formatContextMarkdown(chain: ContextEntry[], targetNode: ThinkgraphNode): string {
    if (chain.length === 0) return ''

    const sections: string[] = []

    // Context chain
    const chainLines = chain.map((entry, i) => {
      const isCurrent = entry.id === targetNode.id
      const prefix = isCurrent ? '→ [CURRENT]' : `${i + 1}.`
      const content = entry.output || entry.brief || entry.title
      const meta = [entry.nodeType, entry.status !== 'idle' ? entry.status : ''].filter(Boolean).join(', ')
      return `${prefix} **${entry.title}**${meta ? ` (${meta})` : ''}\n   ${content}`
    })
    sections.push(`## Context chain\n${chainLines.join('\n\n')}`)

    // Current node details
    if (targetNode.brief) {
      sections.push(`## Current brief\n${targetNode.brief}`)
    }
    if (targetNode.output) {
      sections.push(`## Current output\n${targetNode.output}`)
    }

    return sections.join('\n\n')
  }

  return {
    getAncestorChain,
    getAncestorIds,
    getChildren,
    getSiblings,
    buildContext,
    nodeMap,
  }
}
