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
   * Check if nodes need initial layout
   * Only returns true for initial layout (when most/all nodes are at 0,0)
   * Does NOT return true just because a single new node was added
   *
   * @param nodes - Current nodes array
   * @param options - Optional config
   * @param options.forceCheck - If true, checks all nodes regardless of count
   */
  const needsLayout = (nodes: Node[], options?: { forceCheck?: boolean }): boolean => {
    if (nodes.length === 0) return false

    // Check for explicit layout flag first
    const hasExplicitFlag = nodes.some(node =>
      (node as Node & { _needsLayout?: boolean })._needsLayout === true
    )
    if (hasExplicitFlag) return true

    // Count nodes at origin (0,0) vs nodes with valid positions
    let nodesAtOrigin = 0
    let nodesWithPosition = 0

    for (const node of nodes) {
      if (!node.position || (node.position.x === 0 && node.position.y === 0)) {
        nodesAtOrigin++
      } else {
        nodesWithPosition++
      }
    }

    // Only trigger layout if this looks like an initial load:
    // - All nodes are at (0,0), OR
    // - More than 50% of nodes are at (0,0) AND we have multiple nodes without position
    //
    // This prevents triggering layout when a single new node is added
    // because most existing nodes will have valid positions
    if (nodesAtOrigin === nodes.length) {
      return true
    }

    if (options?.forceCheck && nodesAtOrigin > 0 && nodesAtOrigin > nodesWithPosition) {
      return true
    }

    return false
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
    return nodes.map((node) => {
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
   * This is useful when adding new nodes - we layout only the new ones
   * and keep existing nodes where they are
   */
  const applyLayoutToNew = (nodes: Node[], edges: Edge[]): Node[] => {
    // Separate nodes that need layout from those that don't
    const nodesNeedingLayout: Node[] = []
    const positionedNodes: Node[] = []

    for (const node of nodes) {
      const needsLayoutFlag = (node as Node & { _needsLayout?: boolean })._needsLayout
      const isAtOrigin = !node.position || (node.position.x === 0 && node.position.y === 0)

      if (needsLayoutFlag || isAtOrigin) {
        nodesNeedingLayout.push(node)
      } else {
        positionedNodes.push(node)
      }
    }

    // If no nodes need layout, return as-is
    if (nodesNeedingLayout.length === 0) {
      return nodes
    }

    // If ALL nodes need layout, do a full layout
    if (positionedNodes.length === 0) {
      return applyLayout(nodes, edges)
    }

    // Only layout the nodes that need it
    // Use dagre but only for the new nodes, placing them relative to existing nodes
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    const isHorizontal = direction === 'LR' || direction === 'RL'
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: nodeSpacing,
      ranksep: rankSpacing,
      marginx: 20,
      marginy: 20
    })

    // Add ALL nodes to dagre (so edges work correctly)
    for (const node of nodes) {
      dagreGraph.setNode(node.id, {
        width: nodeWidth,
        height: nodeHeight
      })
    }

    // Add edges
    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    // Run layout
    dagre.layout(dagreGraph)

    // Apply positions - but only to nodes that NEED layout
    // Preserve existing positions for positioned nodes
    const positionedNodeIds = new Set(positionedNodes.map(n => n.id))

    return nodes.map((node) => {
      // Keep existing position for already-positioned nodes
      if (positionedNodeIds.has(node.id)) {
        return {
          ...node,
          _needsLayout: undefined,
          targetPosition: isHorizontal ? 'left' : 'top',
          sourcePosition: isHorizontal ? 'right' : 'bottom'
        } as Node
      }

      // Apply dagre position for nodes that need layout
      const nodeWithPosition = dagreGraph.node(node.id)
      if (!nodeWithPosition) {
        return node
      }

      const newPosition = {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2
      }

      return {
        ...node,
        position: newPosition,
        _needsLayout: undefined,
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom'
      } as Node
    })
  }

  return {
    applyLayout,
    applyLayoutToNew,
    needsLayout
  }
}
