import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@vue-flow/core'
import type { UseFlowLayoutOptions } from '../types/flow'

/**
 * Provides dagre-based auto-layout for Vue Flow graphs
 *
 * @param options - Layout configuration
 * @returns Layout utilities
 *
 * @example
 * ```ts
 * const { applyLayout, needsLayout } = useFlowLayout({ direction: 'TB' })
 *
 * if (needsLayout(nodes)) {
 *   const layoutedNodes = applyLayout(nodes, edges)
 * }
 * ```
 */
export function useFlowLayout(options: UseFlowLayoutOptions = {}) {
  const {
    direction = 'TB',
    nodeSpacing = 50,
    rankSpacing = 100,
    nodeWidth = 172,
    nodeHeight = 36
  } = options

  /**
   * Check if any nodes need layout (missing or zero positions)
   */
  const needsLayout = (nodes: Node[]): boolean => {
    return nodes.some(node => {
      // Check for our custom flag
      if ((node as Node & { _needsLayout?: boolean })._needsLayout) {
        return true
      }
      // Check for default/zero position
      if (!node.position || (node.position.x === 0 && node.position.y === 0)) {
        return true
      }
      return false
    })
  }

  /**
   * Apply dagre layout to nodes
   * Returns new node array with updated positions
   */
  const applyLayout = (nodes: Node[], edges: Edge[]): Node[] => {
    if (nodes.length === 0) return []

    // Create a new dagre graph
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    // Set graph options
    const isHorizontal = direction === 'LR' || direction === 'RL'
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: nodeSpacing,
      ranksep: rankSpacing,
      marginx: 20,
      marginy: 20
    })

    // Add nodes to dagre
    for (const node of nodes) {
      dagreGraph.setNode(node.id, {
        width: nodeWidth,
        height: nodeHeight
      })
    }

    // Add edges to dagre
    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    // Run the layout algorithm
    dagre.layout(dagreGraph)

    // Apply calculated positions back to nodes
    return nodes.map(node => {
      const nodeWithPosition = dagreGraph.node(node.id)

      if (!nodeWithPosition) {
        return node
      }

      // Dagre gives center position, Vue Flow wants top-left
      const newPosition = {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2
      }

      return {
        ...node,
        position: newPosition,
        // Clear the needs layout flag
        _needsLayout: undefined,
        // Set target position for animation
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom'
      } as Node
    })
  }

  /**
   * Layout only nodes that need it, preserving existing positions
   */
  const applyLayoutToNew = (nodes: Node[], edges: Edge[]): Node[] => {
    const needsLayoutNodes = nodes.filter(n =>
      (n as Node & { _needsLayout?: boolean })._needsLayout ||
      (n.position.x === 0 && n.position.y === 0)
    )

    if (needsLayoutNodes.length === 0) {
      return nodes
    }

    // For simplicity, re-layout all nodes when any need layout
    // A more sophisticated approach would only layout new nodes
    return applyLayout(nodes, edges)
  }

  return {
    applyLayout,
    applyLayoutToNew,
    needsLayout
  }
}
