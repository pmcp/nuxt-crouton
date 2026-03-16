import type { ThinkgraphDecision } from '../../layers/thinkgraph/collections/decisions/types'

/**
 * Composable for navigating a decision graph tree.
 * Single source of truth for node lookups, ancestor chains, and related-node queries.
 */
export function useDecisionGraph(decisions: Ref<ThinkgraphDecision[]> | ComputedRef<ThinkgraphDecision[]>) {
  function getNodeById(id: string): ThinkgraphDecision | undefined {
    return toValue(decisions).find(d => d.id === id)
  }

  function getAncestorChain(nodeId: string): ThinkgraphDecision[] {
    const chain: ThinkgraphDecision[] = []
    let current = getNodeById(nodeId)
    while (current) {
      chain.unshift(current)
      current = current.parentId ? getNodeById(current.parentId) : undefined
    }
    return chain
  }

  function getChildren(nodeId: string): ThinkgraphDecision[] {
    return toValue(decisions).filter(d => d.parentId === nodeId)
  }

  function getSiblings(nodeId: string): ThinkgraphDecision[] {
    const node = getNodeById(nodeId)
    if (!node?.parentId) return []
    return toValue(decisions).filter(d => d.parentId === node.parentId && d.id !== nodeId)
  }

  function getStarredOutsidePath(nodeId: string): ThinkgraphDecision[] {
    const ancestorIds = new Set(getAncestorChain(nodeId).map(n => n.id))
    return toValue(decisions).filter(d => d.starred && !ancestorIds.has(d.id))
  }

  function getPinnedOutsidePath(nodeId: string): ThinkgraphDecision[] {
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
