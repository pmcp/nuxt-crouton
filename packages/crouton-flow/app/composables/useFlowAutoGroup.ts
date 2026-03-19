import { ref, type Ref } from 'vue'
import type { Node, NodeDragEvent } from '@vue-flow/core'
import { useFlowGroupManager, type UseFlowGroupManagerOptions } from './useFlowGroupManager'

export interface UseFlowAutoGroupOptions {
  /** How long (ms) the dragged node must hover over a target before triggering (default: 1000) */
  hoverDelay?: number
  /** Overlap threshold as fraction of node area (0–1, default: 0.3) */
  overlapThreshold?: number
  /** Default node width for overlap calculation (default: 200) */
  nodeWidth?: number
  /** Default node height for overlap calculation (default: 80) */
  nodeHeight?: number
  /** Group manager options forwarded to useFlowGroupManager */
  groupManagerOptions?: UseFlowGroupManagerOptions
}

export interface AutoGroupResult {
  /** The newly created group node */
  groupNode: Node
  /** Updated nodes array with both nodes parented to the group */
  nodes: Node[]
}

/**
 * Auto-group nodes on sustained drag overlap.
 *
 * When a node is dragged over another node for `hoverDelay` ms, the target
 * node shakes to signal an impending group. On drop, both nodes are wrapped
 * in a new group container.
 *
 * Uses DOM class toggling for the shake animation so it works with any
 * custom node component (ThinkgraphDecisionsNode, etc.).
 *
 * @example
 * ```ts
 * const { handleDrag, handleDragStop, shakingNodeId, groupManager } = useFlowAutoGroup()
 *
 * onNodeDrag((event) => handleDrag(currentNodes, event))
 * onNodeDragStop((event) => {
 *   const result = handleDragStop(currentNodes, event)
 *   if (result) {
 *     // result.nodes contains the updated nodes array with the group
 *   }
 * })
 * ```
 */
export function useFlowAutoGroup(options: UseFlowAutoGroupOptions = {}) {
  const {
    hoverDelay = 1000,
    overlapThreshold = 0.3,
    nodeWidth = 200,
    nodeHeight = 80,
    groupManagerOptions = {},
  } = options

  const groupManager = useFlowGroupManager({
    groupNodeType: 'resizableGroup',
    ...groupManagerOptions,
  })

  /** ID of the node currently shaking (visual feedback) */
  const shakingNodeId: Ref<string | null> = ref(null)

  // Internal state
  let hoverTimer: ReturnType<typeof setTimeout> | null = null
  let currentTargetId: string | null = null
  let isShaking = false

  // ─── DOM class toggling ───
  function setShakeDOM(nodeId: string | null) {
    // Remove from all nodes first
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.crouton-flow-auto-group-target').forEach((el) => {
        el.classList.remove('crouton-flow-auto-group-target')
      })
      if (nodeId) {
        const el = document.querySelector(`[data-id="${CSS.escape(nodeId)}"]`)
        if (el) el.classList.add('crouton-flow-auto-group-target')
      }
    }
  }

  function clearHover() {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      hoverTimer = null
    }
    currentTargetId = null
    isShaking = false
    shakingNodeId.value = null
    setShakeDOM(null)
  }

  /**
   * Get the bounding box of a node in absolute coordinates.
   * For child nodes inside a group, converts to absolute by adding parent position.
   */
  function getNodeBounds(node: Node, allNodes: Node[]) {
    let x = node.position.x
    let y = node.position.y

    // Convert to absolute if inside a parent
    if (node.parentNode) {
      const parent = allNodes.find(n => n.id === node.parentNode)
      if (parent) {
        x += parent.position.x
        y += parent.position.y
      }
    }

    const style = node.style as Record<string, string> | undefined
    const w = node.dimensions?.width
      ?? (style?.width ? parseInt(style.width) : nodeWidth)
    const h = node.dimensions?.height
      ?? (style?.height ? parseInt(style.height) : nodeHeight)

    return { x, y, w, h }
  }

  /**
   * Check if two rectangles overlap by at least `overlapThreshold` of the smaller one.
   */
  function rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ): boolean {
    const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
    const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
    const overlapArea = overlapX * overlapY
    const smallerArea = Math.min(a.w * a.h, b.w * b.h)
    return smallerArea > 0 && overlapArea / smallerArea >= overlapThreshold
  }

  /**
   * Find the node under the dragged node (if any).
   * Skips group/container nodes and the dragged node itself.
   */
  function findOverlapTarget(nodes: Node[], draggedNode: Node): Node | null {
    const dragBounds = getNodeBounds(draggedNode, nodes)

    for (const node of nodes) {
      if (node.id === draggedNode.id) continue
      // Skip nodes that are already groups/containers
      if (node.type === 'resizableGroup') continue
      // Skip ghost nodes
      if (node.data?.isGhost) continue
      // Skip nodes already in the same group as the dragged node
      if (draggedNode.parentNode && node.parentNode === draggedNode.parentNode) continue

      const targetBounds = getNodeBounds(node, nodes)
      if (rectsOverlap(dragBounds, targetBounds)) {
        return node
      }
    }
    return null
  }

  /**
   * Call during onNodeDrag to track hover overlap.
   */
  function handleDrag(currentNodes: Node[], event: NodeDragEvent) {
    const { node } = event
    const target = findOverlapTarget(currentNodes, node)

    if (!target) {
      // No overlap — clear any pending hover
      clearHover()
      return
    }

    if (target.id === currentTargetId) {
      // Still hovering over the same target — timer is running (or already shaking)
      return
    }

    // New target — reset timer
    clearHover()
    currentTargetId = target.id

    hoverTimer = setTimeout(() => {
      // Sustained hover reached — trigger shake
      isShaking = true
      shakingNodeId.value = currentTargetId
      setShakeDOM(currentTargetId)
    }, hoverDelay)
  }

  /**
   * Call during onNodeDragStop. If a shake was active, creates a group
   * wrapping the dragged node and the target node.
   *
   * Returns `AutoGroupResult` if a group was created, `null` otherwise.
   */
  function handleDragStop(currentNodes: Node[], event: NodeDragEvent): AutoGroupResult | null {
    if (!isShaking || !currentTargetId) {
      clearHover()
      return null
    }

    const { node: draggedNode } = event
    const targetNodeId = currentTargetId

    // Clear state immediately
    clearHover()

    // Find both nodes
    const targetNode = currentNodes.find(n => n.id === targetNodeId)
    if (!targetNode) return null

    // Don't group a node with itself
    if (draggedNode.id === targetNodeId) return null

    // Calculate group position and size to encompass both nodes
    const dragBounds = getNodeBounds(draggedNode, currentNodes)
    const targetBounds = getNodeBounds(targetNode, currentNodes)

    const padding = 40
    const headerHeight = 45

    const groupX = Math.min(dragBounds.x, targetBounds.x) - padding
    const groupY = Math.min(dragBounds.y, targetBounds.y) - padding - headerHeight
    const groupRight = Math.max(dragBounds.x + dragBounds.w, targetBounds.x + targetBounds.w) + padding
    const groupBottom = Math.max(dragBounds.y + dragBounds.h, targetBounds.y + targetBounds.h) + padding
    const groupW = groupRight - groupX
    const groupH = groupBottom - groupY

    // Create group node
    const groupNode = groupManager.createGroup('Group', { x: groupX, y: groupY })

    // Override dimensions to fit the children
    groupNode.style = {
      ...(groupNode.style as Record<string, string>),
      width: `${groupW}px`,
      height: `${groupH}px`,
    }

    // Re-parent both nodes into the group (convert to relative positions)
    const updatedNodes = currentNodes.map((n) => {
      if (n.id === draggedNode.id) {
        const bounds = getNodeBounds(n, currentNodes)
        return {
          ...n,
          parentNode: groupNode.id,
          extent: 'parent' as const,
          position: {
            x: bounds.x - groupX,
            y: bounds.y - groupY,
          },
          data: { ...n.data, grouped: true },
        }
      }
      if (n.id === targetNodeId) {
        const bounds = getNodeBounds(n, currentNodes)
        return {
          ...n,
          parentNode: groupNode.id,
          extent: 'parent' as const,
          position: {
            x: bounds.x - groupX,
            y: bounds.y - groupY,
          },
          data: { ...n.data, grouped: true },
        }
      }
      return n
    })

    // Add the group node (must come before its children in the array)
    const finalNodes = [groupNode, ...updatedNodes]

    return {
      groupNode,
      nodes: finalNodes,
    }
  }

  /**
   * Cleanup — call on component unmount.
   */
  function dispose() {
    clearHover()
  }

  return {
    /** Reactive ID of the currently shaking node (null if none) */
    shakingNodeId,
    /** The underlying group manager (for manual group operations) */
    groupManager,
    /** Call on every onNodeDrag event */
    handleDrag,
    /** Call on onNodeDragStop — returns group result or null */
    handleDragStop,
    /** Manually clear any pending hover/shake state */
    clearHover,
    /** Cleanup timers */
    dispose,
  }
}
