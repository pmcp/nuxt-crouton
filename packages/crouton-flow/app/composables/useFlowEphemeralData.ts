import { computed, type ComputedRef, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { UseFlowEphemeralDataOptions } from '../types/flow'

/**
 * Convert non-collection items (e.g. Notion pages) to Vue Flow nodes.
 *
 * Unlike useFlowData which expects collection rows with standard fields,
 * this composable uses resolver functions to map arbitrary external data
 * to Vue Flow node properties.
 *
 * @param items - Reactive array of external items (each must have an `id` field)
 * @param options - Resolver functions for node type, container, dimensions, label, position
 * @returns Nodes and edges for Vue Flow
 *
 * @example
 * ```ts
 * const { nodes, edges } = useFlowEphemeralData(
 *   computed(() => notionPages),
 *   {
 *     resolveNodeType: () => 'notionCard',
 *     resolveLabel: (item) => item.title as string,
 *     resolveContainerId: (item) => item.groupId as string | null,
 *     resolvePosition: (item) => item.position as { x: number, y: number },
 *   }
 * )
 * ```
 */
export function useFlowEphemeralData<T extends Record<string, unknown>>(
  items: Ref<T[]> | ComputedRef<T[]>,
  options: UseFlowEphemeralDataOptions = {}
) {
  const {
    resolveNodeType = () => 'default',
    resolveContainerId = () => null,
    resolveDimensions = () => undefined,
    resolveLabel = (item) => (item.title as string) || (item.name as string) || (item.id as string) || '',
    resolvePosition = () => undefined,
  } = options

  const itemMap = computed(() => {
    const map = new Map<string, T>()
    for (const item of items.value) {
      const id = item.id as string
      if (id) map.set(id, item)
    }
    return map
  })

  const nodes = computed<Node[]>(() => {
    return items.value.map((item) => {
      const id = item.id as string
      const nodeType = resolveNodeType(item)
      const containerId = resolveContainerId(item)
      const dimensions = resolveDimensions(item)
      const label = resolveLabel(item)
      const position = resolvePosition(item) ?? { x: 0, y: 0 }

      const node: Node = {
        id,
        type: nodeType,
        position,
        data: item,
        label,
      }

      // Set Vue Flow parentNode for container relationship
      if (containerId) {
        node.parentNode = containerId
      }

      // Apply dimensions as style if provided
      if (dimensions) {
        node.style = {
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }
      }

      // Mark nodes without explicit position for layout
      if (!resolvePosition(item)) {
        ;(node as any)._needsLayout = true
      }

      return node
    })
  })

  // Edges from container relationships (containerId → parentNode)
  const edges = computed<Edge[]>(() => {
    // Ephemeral data typically doesn't have edge relationships
    // Container relationships are expressed via parentNode, not edges
    return []
  })

  const getNode = (id: string): Node | undefined => {
    return nodes.value.find(n => n.id === id)
  }

  const getItem = (id: string): T | undefined => {
    return itemMap.value.get(id)
  }

  return {
    nodes,
    edges,
    getNode,
    getItem,
  }
}
