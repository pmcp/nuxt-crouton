import type { ThinkgraphNode } from '../../layers/thinkgraph/collections/nodes/types'

/**
 * Composable for navigating a decision graph tree.
 * Single source of truth for node lookups, ancestor chains, and related-node queries.
 */
export function useDecisionGraph(decisions: Ref<ThinkgraphNode[]> | ComputedRef<ThinkgraphNode[]>) {
  function getNodeById(id: string): ThinkgraphNode | undefined {
    return toValue(decisions).find(d => d.id === id)
  }

  function getAncestorChain(nodeId: string): ThinkgraphNode[] {
    const chain: ThinkgraphNode[] = []
    let current = getNodeById(nodeId)
    while (current) {
      chain.unshift(current)
      current = current.parentId ? getNodeById(current.parentId) : undefined
    }
    return chain
  }

  function getChildren(nodeId: string): ThinkgraphNode[] {
    return toValue(decisions).filter(d => d.parentId === nodeId)
  }

  function getSiblings(nodeId: string): ThinkgraphNode[] {
    const node = getNodeById(nodeId)
    if (!node?.parentId) return []
    return toValue(decisions).filter(d => d.parentId === node.parentId && d.id !== nodeId)
  }

  function getStarredOutsidePath(nodeId: string): ThinkgraphNode[] {
    const ancestorIds = new Set(getAncestorChain(nodeId).map(n => n.id))
    return toValue(decisions).filter(d => d.starred && !ancestorIds.has(d.id))
  }

  function getPinnedOutsidePath(nodeId: string): ThinkgraphNode[] {
    const ancestorIds = new Set(getAncestorChain(nodeId).map(n => n.id))
    return toValue(decisions).filter(d => d.pinned && !ancestorIds.has(d.id))
  }

  return {
    getNodeById,
    getAncestorChain,
    getChildren,
    getSiblings,
    getStarredOutsidePath,
    getPinnedOutsidePath,
  }
}
