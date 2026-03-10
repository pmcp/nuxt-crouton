import { nextTick } from 'vue'
import type { Node, NodeDragEvent } from '@vue-flow/core'
import type { NodeTypeRegistration } from '../types/flow'

export interface ContainerChangeEvent {
  /** The node that was dragged */
  nodeId: string
  /** Previous container ID (null if ungrouped) */
  fromContainerId: string | null
  /** New container ID (null if removed from container) */
  toContainerId: string | null
  /** New position (absolute or relative to container) */
  position: { x: number, y: number }
}

export interface UseFlowContainerDetectionOptions {
  /** Node type registrations — used to identify which types are containers */
  nodeTypeComponents: Record<string, NodeTypeRegistration>
  /** Default card dimensions for center calculation */
  cardWidth?: number
  cardHeight?: number
}

/**
 * Detect card-over-group overlap on drag stop and emit container change events.
 *
 * Extracted from categorize.vue's onNodeDragStop logic.
 * Call `handleDragStop` from VueFlow's `onNodeDragStop` event.
 *
 * @example
 * ```ts
 * const { handleDragStop } = useFlowContainerDetection({
 *   nodeTypeComponents: {
 *     resizableGroup: { component: ResizableGroupNode, isContainer: true },
 *     notionCard: { component: NotionCardNode },
 *   },
 * })
 * ```
 */
export function useFlowContainerDetection(options: UseFlowContainerDetectionOptions) {
  const { nodeTypeComponents, cardWidth = 220, cardHeight = 80 } = options

  // Identify which node types are containers
  const containerTypes = new Set<string>()
  for (const [type, reg] of Object.entries(nodeTypeComponents)) {
    if (reg.isContainer) containerTypes.add(type)
  }

  /**
   * Given all current nodes and a drag stop event, detect if the dragged node
   * landed inside/outside a container and return the update instructions.
   */
  function detectContainer(
    nodes: Node[],
    event: NodeDragEvent,
  ): ContainerChangeEvent | null {
    const { node } = event

    // Don't detect containers for container nodes themselves
    if (containerTypes.has(node.type as string)) return null

    const containerNodes = nodes.filter(n => containerTypes.has(n.type as string))
    if (containerNodes.length === 0) return null

    // Calculate card center in absolute coordinates
    let cardCenterX = node.position.x + cardWidth / 2
    let cardCenterY = node.position.y + cardHeight / 2

    // If already inside a parent, convert to absolute coords
    if (node.parentNode) {
      const parentGroup = containerNodes.find(g => g.id === node.parentNode)
      if (parentGroup) {
        cardCenterX += parentGroup.position.x
        cardCenterY += parentGroup.position.y
      }
    }

    // Find target container by checking if card center is inside any container
    let targetContainer: Node | null = null
    for (const container of containerNodes) {
      const styleObj = container.style as Record<string, string> | undefined
      const cw = parseInt(styleObj?.width || '500')
      const ch = parseInt(styleObj?.height || '400')

      if (
        cardCenterX >= container.position.x
        && cardCenterX <= container.position.x + cw
        && cardCenterY >= container.position.y
        && cardCenterY <= container.position.y + ch
      ) {
        targetContainer = container
        break
      }
    }

    const fromContainerId = (node.parentNode as string) || null
    const toContainerId = targetContainer?.id || null

    // No change
    if (fromContainerId === toContainerId) return null

    // Calculate new position
    let newPosition: { x: number, y: number }
    if (targetContainer) {
      // Relative to container
      const relX = cardCenterX - targetContainer.position.x - cardWidth / 2
      const relY = cardCenterY - targetContainer.position.y - cardHeight / 2
      newPosition = { x: Math.max(10, relX), y: Math.max(30, relY) }
    }
    else {
      // Absolute position (removed from container)
      newPosition = { x: cardCenterX - cardWidth / 2, y: cardCenterY - cardHeight / 2 }
    }

    return {
      nodeId: node.id,
      fromContainerId,
      toContainerId,
      position: newPosition,
    }
  }

  /**
   * Apply a container change to the nodes array (mutates in nextTick).
   * Returns the updated nodes array.
   */
  function applyContainerChange(
    nodes: Node[],
    change: ContainerChangeEvent,
  ): Node[] {
    return nodes.map((n) => {
      if (n.id !== change.nodeId) return n

      if (change.toContainerId) {
        return {
          ...n,
          parentNode: change.toContainerId,
          position: change.position,
          data: { ...n.data, grouped: true },
        }
      }
      else {
        return {
          ...n,
          parentNode: undefined,
          extent: undefined,
          position: change.position,
          data: { ...n.data, grouped: false },
        }
      }
    })
  }

  /**
   * Full drag-stop handler: detect + apply container change.
   * Pass current nodes ref and get back updated nodes, or null if no change.
   */
  function handleDragStop(
    currentNodes: Node[],
    event: NodeDragEvent,
  ): { nodes: Node[], change: ContainerChangeEvent } | null {
    const change = detectContainer(currentNodes, event)
    if (!change) return null

    const updatedNodes = applyContainerChange(currentNodes, change)
    return { nodes: updatedNodes, change }
  }

  return {
    containerTypes,
    detectContainer,
    applyContainerChange,
    handleDragStop,
  }
}
